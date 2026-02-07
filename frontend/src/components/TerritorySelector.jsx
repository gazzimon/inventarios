import { useEffect, useState } from 'react'

const INVENTORY_OPTIONS = [
  { value: 'ipcc', label: 'Inventario IPCC' },
  { value: 'extended', label: 'Inventario ampliado' }
]

export default function TerritorySelector({
  provinceId,
  setProvinceId,
  provinceName,
  setProvinceName,
  departmentId,
  setDepartmentId,
  departmentName,
  setDepartmentName,
  year,
  setYear,
  inventoryMode,
  setInventoryMode,
  onSubmit
}) {
  const [provinces, setProvinces] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/ipcc/provinces')
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Error al cargar provincias')
        if (active) {
          setProvinces(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (active) setError(err.message || 'Error inesperado')
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!provinceName) {
      setDepartments([])
      return
    }
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(
          `/api/ipcc/departments?province=${encodeURIComponent(provinceName)}`
        )
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Error al cargar departamentos')
        if (active) {
          setDepartments(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (active) setError(err.message || 'Error inesperado')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [provinceName])

  return (
    <section className="panel">
      <form
        className="selector"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.()
        }}
      >
        <label className="field">
          <span>Provincia</span>
          <select
            value={provinceId || ''}
            onChange={(event) => {
              const nextId = event.target.value
              const selected = provinces.find((p) => p.id === nextId)
              setProvinceId(nextId || null)
              setProvinceName(selected?.name || '')
              setDepartmentId(null)
              setDepartmentName('')
            }}
            required
          >
            <option value="">Seleccionar provincia</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Departamento (opcional)</span>
          <select
            value={departmentId || ''}
            onChange={(event) => {
              const nextId = event.target.value
              const selected = departments.find((d) => d.id === nextId)
              setDepartmentId(nextId || null)
              setDepartmentName(selected?.name || '')
            }}
          >
            <option value="">Total provincial</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
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

        {error && <p className="helper">{error}</p>}

        <button className="primary" type="submit" disabled={!provinceId || loading}>
          {loading ? 'Cargando…' : 'Consultar inventario'}
        </button>
      </form>
    </section>
  )
}
