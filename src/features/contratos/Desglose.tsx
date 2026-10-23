import {
  COMISION_PCT,
  calcularDesglose,
  formatoMonto,
} from '../../../shared/domain/contrato'

type Props = { honorarios: number; leyenda?: string }

/** Desglose de honorarios: lo que paga el cliente, la comisión de Specter y lo que recibe el abogado. */
export function Desglose({ honorarios, leyenda }: Props) {
  const d = calcularDesglose(honorarios)
  return (
    <table className="desglose">
      {leyenda && <caption>{leyenda}</caption>}
      <tbody>
        <tr>
          <th scope="row">Honorarios del asunto</th>
          <td>{formatoMonto(d.honorarios)}</td>
        </tr>
        <tr>
          <th scope="row">Comisión de Specter ({COMISION_PCT * 100}%)</th>
          <td>{formatoMonto(d.comision)}</td>
        </tr>
        <tr className="desglose__total">
          <th scope="row">Recibe el abogado</th>
          <td>{formatoMonto(d.abogadoRecibe)}</td>
        </tr>
        <tr>
          <th scope="row">Impuestos</th>
          <td>Por definir</td>
        </tr>
        <tr>
          <th scope="row">Paga el cliente</th>
          <td>{formatoMonto(d.totalCliente)} más impuestos</td>
        </tr>
      </tbody>
    </table>
  )
}
