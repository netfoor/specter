import { act, renderHook, waitFor } from '@testing-library/react'
import { useConsulta } from './useConsulta'

describe('useConsulta', () => {
  it('carga y entrega los datos de la clave actual', async () => {
    const { result } = renderHook(() => useConsulta('a', async () => 1))
    expect(result.current.estado).toBe('cargando')
    await waitFor(() => expect(result.current).toEqual({ estado: 'listo', datos: 1 }))
  })

  it('sin conservar, una clave nueva vuelve a «cargando»', async () => {
    let clave = 'a'
    const { result, rerender } = renderHook(() => useConsulta(clave, async () => clave))
    await waitFor(() => expect(result.current.estado).toBe('listo'))
    clave = 'b'
    rerender()
    expect(result.current.estado).toBe('cargando')
  })

  it('con conservar, muestra los datos anteriores hasta que llegan los nuevos', async () => {
    let clave = 'a'
    let liberar: (v: string) => void = () => {}
    const { result, rerender } = renderHook(() =>
      useConsulta(
        clave,
        () =>
          clave === 'a'
            ? Promise.resolve('viejo')
            : new Promise<string>((r) => (liberar = r)),
        {
          conservar: true,
        },
      ),
    )
    await waitFor(() =>
      expect(result.current).toEqual({ estado: 'listo', datos: 'viejo' }),
    )
    clave = 'b'
    rerender()
    expect(result.current).toEqual({ estado: 'listo', datos: 'viejo' })
    await act(async () => liberar('nuevo'))
    expect(result.current).toEqual({ estado: 'listo', datos: 'nuevo' })
  })

  it('informa error si la consulta falla', async () => {
    const { result } = renderHook(() =>
      useConsulta('a', () => Promise.reject(new Error('x'))),
    )
    await waitFor(() => expect(result.current.estado).toBe('error'))
  })
})
