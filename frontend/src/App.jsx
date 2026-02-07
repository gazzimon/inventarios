import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [mode, setMode] = useState('province')
  const [name, setName] = useState('Misiones')
  const [years, setYears] = useState('2022')
  const [gas, setGas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [citySuggestions, setCitySuggestions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityError, setCityError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    setName(mode === 'province' ? 'Misiones' : 'Capital')
    setCitySuggestions([])
    setCityError('')
    setShowSuggestions(false)
  }, [mode])

  const endpoint = useMemo(() => {
    return mode === 'province' ? '/api/ar/province-inventory' : '/api/ar/city-inventory'
  }, [mode])

  const formatNumber = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—'
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)
  }

  const readJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(text ? 'Respuesta no JSON desde el servidor' : 'Respuesta vacia del servidor')
    }
    return response.json()
  }

  useEffect(() => {
    if (mode !== 'city') return
    const query = name.trim()
    if (query.length < 2) {
      setCitySuggestions([])
      setCityError('')
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      setCityLoading(true)
      setCityError('')

      try {
        const response = await fetch(`/api/ar/department-search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        })
        const data = await readJsonResponse(response)
        if (!response.ok) {
          throw new Error(data?.error || 'Error al buscar departamentos')
        }
        setCitySuggestions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err.name === 'AbortError') return
        setCityError(err.message || 'Error inesperado')
        setCitySuggestions([])
      } finally {
        setCityLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [mode, name])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const params = new URLSearchParams()
      if (name) params.set('name', name)
      if (years) params.set('years', years)
      if (gas) params.set('gas', gas)

      const response = await fetch(`${endpoint}?${params.toString()}`)
      const data = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(data?.error || 'Error al consultar la API')
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">ClimateTrace Argentina</p>
          <h1>Inventarios de emisiones por provincia y departamento</h1>
          <p className="subtitle">
            Consulta emisiones agregadas usando la API v6. Selecciona provincia o departamento,
            define los años y recibe el resumen inmediato.
          </p>
        </div>
        <div className="hero-card">
          <p className="hero-label">Ejemplos rápidos</p>
          <div className="quick-actions">
            <button type="button" onClick={() => { setMode('province'); setName('Misiones') }}>
              Provincia: Misiones
            </button>
            <button type="button" onClick={() => { setMode('city'); setName('Capital') }}>
              Departamento: Capital
            </button>
          </div>
          <p className="hero-note">Se usa `years=2022` por defecto si no indicas otro año.</p>
        </div>
      </header>

      <section className="panel">
        <form className="form" onSubmit={handleSubmit}>
          <div className="segmented">
            <button
              type="button"
              className={mode === 'province' ? 'active' : ''}
              onClick={() => setMode('province')}
            >
              Provincia
            </button>
            <button
              type="button"
              className={mode === 'city' ? 'active' : ''}
              onClick={() => setMode('city')}
            >
              Departamento
            </button>
          </div>

          <label className="field">
            <span>Nombre</span>
            <div className="autocomplete">
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (mode === 'city') setShowSuggestions(true)
                }}
                onFocus={() => {
                  if (mode === 'city') setShowSuggestions(true)
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 120)
                }}
                placeholder={mode === 'province' ? 'Misiones' : 'Capital'}
                required
              />
              {mode === 'city' && showSuggestions && (
                <div className="suggestions">
                  {cityLoading && <div className="suggestion muted">Buscando…</div>}
                  {cityError && <div className="suggestion error">{cityError}</div>}
                  {!cityLoading && !cityError && citySuggestions.length === 0 && (
                    <div className="suggestion muted">Sin resultados</div>
                  )}
                  {!cityLoading &&
                    !cityError &&
                    citySuggestions.map((item) => (
                      <button
                        type="button"
                        className="suggestion"
                        key={item.id}
                        onClick={() => {
                          setName(item.name)
                          setShowSuggestions(false)
                        }}
                      >
                        <span>{item.name}</span>
                        <small>{item.fullName}</small>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </label>

          <label className="field">
            <span>Años</span>
            <input
              type="text"
              value={years}
              onChange={(event) => setYears(event.target.value)}
              placeholder="2022 o 2020,2021,2022"
            />
          </label>

          <label className="field">
            <span>Gas (opcional)</span>
            <input
              type="text"
              value={gas}
              onChange={(event) => setGas(event.target.value)}
              placeholder="co2e_100yr, co2e_20yr, co2, ch4, n2o"
            />
          </label>

          <div className="actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Consultando…' : 'Consultar inventario'}
            </button>
            <span className="endpoint">Endpoint: {endpoint}</span>
          </div>
        </form>
      </section>

      <section className="results">
        {error && <div className="alert error">{error}</div>}

        {result && (
          <div className="result-card">
            <div className="result-header">
              <div>
                <p className="result-title">{result.name}</p>
                <p className="result-meta">
                  Nivel {result.level} · Admin ID {result.adminId} · Años {result.years}
                  {result.gas ? ` · Gas ${result.gas}` : ''}
                </p>
              </div>
              <div className="badge">Argentina</div>
            </div>

            <div className="table">
              <div className="table-row table-head">
                <span>País</span>
                <span>Gas</span>
                <span>Activos</span>
                <span>Emisiones</span>
              </div>
              {((result.data && (result.data.all || result.data.All)) || []).map((item, index) => (
                <div className="table-row" key={`${item?.Country || 'NA'}-${index}`}>
                  <span>{item?.Country || '—'}</span>
                  <span>{item?.Gas || '—'}</span>
                  <span>{formatNumber(item?.AssetCount)}</span>
                  <span>{formatNumber(item?.Emissions)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default App
