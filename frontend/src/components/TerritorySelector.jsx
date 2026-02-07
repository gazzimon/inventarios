import { useEffect, useMemo, useState } from 'react'

const LEVEL_OPTIONS = [
  { value: 'province', label: 'Provincia', apiLevel: 1 },
  { value: 'department', label: 'Municipio / Departamento', apiLevel: 2 }
]

const INVENTORY_OPTIONS = [
  { value: 'ipcc', label: 'Inventario IPCC' },
  { value: 'extended', label: 'Inventario ampliado' }
]

export default function TerritorySelector({
  level,
  setLevel,
  adminName,
  setAdminName,
  year,
  setYear,
  inventoryMode,
  setInventoryMode,
  onSubmit
}) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showList, setShowList] = useState(false)

  const apiLevel = useMemo(() => {
    return LEVEL_OPTIONS.find((option) => option.value === level)?.apiLevel || 1
  }, [level])

  useEffect(() => {
    const query = String(adminName || '').trim()
    if (query.length < 2) {
      setSuggestions([])
      setError('')
      return
    }

    const controller = new AbortController()
    const handle = setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `/api/ipcc/search?level=${apiLevel}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Error en búsqueda')
        }
        setSuggestions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message || 'Error inesperado')
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(handle)
    }
  }, [adminName, apiLevel])

  return (
    <section className="panel">
      <form
        className="selector"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.()
        }}
      >
        <div className="field">
          <span>Ámbito</span>
          <div className="segmented">
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={level === option.value ? 'active' : ''}
                onClick={() => {
                  setLevel(option.value)
                  setSuggestions([])
                  setShowList(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Nombre</span>
          <div className="autocomplete">
            <input
              type="text"
              value={adminName}
              onChange={(event) => {
                setAdminName(event.target.value)
                setShowList(true)
              }}
              onFocus={() => setShowList(true)}
              onBlur={() => setTimeout(() => setShowList(false), 120)}
              placeholder={level === 'province' ? 'Misiones' : 'Posadas'}
              required
            />
            {showList && (
              <div className="suggestions">
                {loading && <div className="suggestion muted">Buscando…</div>}
                {error && <div className="suggestion error">{error}</div>}
                {!loading && !error && suggestions.length === 0 && (
                  <div className="suggestion muted">Sin resultados</div>
                )}
                {!loading &&
                  !error &&
                  suggestions.map((item) => (
                    <button
                      type="button"
                      className="suggestion"
                      key={item.id}
                      onClick={() => {
                        setAdminName(item.name)
                        setShowList(false)
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
          <span>Año</span>
          <input
            type="number"
            min="2000"
            max="2050"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            required
          />
        </label>

        <div className="field">
          <span>Modo de inventario</span>
          <div className="segmented">
            {INVENTORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={inventoryMode === option.value ? 'active' : ''}
                onClick={() => setInventoryMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button className="primary" type="submit">
          Consultar inventario
        </button>
      </form>
    </section>
  )
}
