import type { FormularioPerfil } from '../../shared/domain/perfil'

/**
 * Datos de demostración. Todas las personas, cédulas y correos son ficticios: los correos usan
 * un subdominio sin buzones y las cédulas llevan el prefijo DEMO.
 */
export const DOMINIO_DEMO = 'demo.specter.foor.dev'

export const CUENTAS_DEMO = {
  admin: {
    correo: `admin@${DOMINIO_DEMO}`,
    nombre: 'Administración Demo',
    grupo: 'ADMIN',
  },
  cliente: {
    correo: `cliente@${DOMINIO_DEMO}`,
    nombre: 'Cliente Demo',
    grupo: 'CLIENTE',
  },
} as const

/** `verificado` y `publicado` salen en el directorio; `pendiente` espera la revisión del panel. */
export type SituacionDemo = 'verificado' | 'publicado' | 'pendiente'

export type AbogadoDemo = {
  id: string
  correo: string
  situacion: SituacionDemo
  formulario: FormularioPerfil
}

type Base = Omit<FormularioPerfil, 'cedula'> & { situacion: SituacionDemo }

const BASE: Base[] = [
  {
    situacion: 'verificado',
    nombre: 'Elena Rivas Cordero',
    materias: ['CIVIL', 'FAMILIAR'],
    especialidades: 'Arrendamiento, Divorcios, Pensión alimenticia',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla',
    idiomas: 'Español, Inglés',
    aniosExperiencia: '11',
    modalidad: 'AMBAS',
    honorariosDesde: '4500',
    honorariosHasta: '25000',
    disponibilidad: 'Lunes a viernes de 9 a 18 h',
    semblanza:
      'Litigante en materia civil y familiar. Acompaño a mis clientes desde la primera consulta hasta la sentencia.',
  },
  {
    situacion: 'verificado',
    nombre: 'Marco Antonio Lezama Pineda',
    materias: ['MERCANTIL', 'FISCAL'],
    especialidades: 'Contratos mercantiles, Cobranza, Defensa fiscal',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla, Tlaxcala',
    idiomas: 'Español, Inglés',
    aniosExperiencia: '16',
    modalidad: 'AMBAS',
    honorariosDesde: '8000',
    honorariosHasta: '60000',
    disponibilidad: 'Previa cita',
    semblanza:
      'Asesoro a pequeñas y medianas empresas en contratos, cobranza y controversias fiscales.',
  },
  {
    situacion: 'verificado',
    nombre: 'Daniela Quiroz Báez',
    materias: ['LABORAL'],
    especialidades: 'Despidos, Finiquitos, Contratos laborales',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla',
    idiomas: 'Español',
    aniosExperiencia: '7',
    modalidad: 'VIRTUAL',
    honorariosDesde: '3000',
    honorariosHasta: '15000',
    disponibilidad: 'Lunes a sábado de 10 a 19 h',
    semblanza: 'Defiendo a personas trabajadoras en despidos y conflictos con su patrón.',
  },
  {
    situacion: 'verificado',
    nombre: 'Héctor Salgado Moreno',
    materias: ['PENAL'],
    especialidades: 'Defensa penal, Medidas cautelares, Amparo penal',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla',
    idiomas: 'Español',
    aniosExperiencia: '19',
    modalidad: 'PRESENCIAL',
    honorariosDesde: '10000',
    honorariosHasta: '80000',
    disponibilidad: 'Atención de urgencia las 24 horas',
    semblanza:
      'Defensa penal desde la primera audiencia, con atención inmediata en casos urgentes.',
  },
  {
    situacion: 'verificado',
    nombre: 'Ximena Aguilar Tapia',
    materias: ['FAMILIAR'],
    especialidades: 'Custodia, Convivencias, Sucesiones',
    ubicacion: 'San Andrés Cholula',
    jurisdicciones: 'Puebla',
    idiomas: 'Español, Inglés',
    aniosExperiencia: '9',
    modalidad: 'AMBAS',
    honorariosDesde: '5000',
    honorariosHasta: '30000',
    disponibilidad: 'Martes a sábado',
    semblanza:
      'Me enfoco en acuerdos que protejan a las familias antes de llegar a juicio.',
  },
  {
    situacion: 'verificado',
    nombre: 'Rodrigo Cabrera Luna',
    materias: ['ADMINISTRATIVO', 'AMPARO'],
    especialidades: 'Licencias y permisos, Responsabilidades administrativas, Amparo',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla, Federal',
    idiomas: 'Español',
    aniosExperiencia: '13',
    modalidad: 'AMBAS',
    honorariosDesde: '9000',
    honorariosHasta: '70000',
    disponibilidad: 'Lunes a viernes',
    semblanza:
      'Litigio frente a autoridades estatales y federales, con énfasis en juicio de amparo.',
  },
  {
    situacion: 'verificado',
    nombre: 'Paulina Ochoa Mendoza',
    materias: ['CIVIL', 'MERCANTIL'],
    especialidades: 'Compraventa de inmuebles, Contratos, Cobranza',
    ubicacion: 'Atlixco',
    jurisdicciones: 'Puebla',
    idiomas: 'Español',
    aniosExperiencia: '6',
    modalidad: 'PRESENCIAL',
    honorariosDesde: '3500',
    honorariosHasta: '20000',
    disponibilidad: 'Lunes a viernes de 9 a 17 h',
    semblanza:
      'Reviso contratos y acompaño operaciones de compraventa para evitar problemas futuros.',
  },
  {
    situacion: 'verificado',
    nombre: 'Gustavo Esparza Villa',
    materias: ['FISCAL'],
    especialidades: 'Auditorías, Recursos de revocación, Planeación fiscal',
    ubicacion: 'Ciudad de México',
    jurisdicciones: 'Federal',
    idiomas: 'Español, Inglés',
    aniosExperiencia: '22',
    modalidad: 'VIRTUAL',
    honorariosDesde: '12000',
    honorariosHasta: '90000',
    disponibilidad: 'Previa cita',
    semblanza:
      'Atiendo a contribuyentes ante revisiones y controversias con la autoridad fiscal.',
  },
  {
    situacion: 'publicado',
    nombre: 'Itzel Camacho Ramos',
    materias: ['LABORAL', 'FAMILIAR'],
    especialidades: 'Pensiones, Conflictos laborales',
    ubicacion: 'Tehuacán',
    jurisdicciones: 'Puebla',
    idiomas: 'Español',
    aniosExperiencia: '4',
    modalidad: 'AMBAS',
    honorariosDesde: '2500',
    honorariosHasta: '12000',
    disponibilidad: 'Lunes a viernes',
    semblanza:
      'Empiezo mi práctica independiente atendiendo asuntos laborales y familiares.',
  },
  {
    situacion: 'publicado',
    nombre: 'Fernando Zepeda Arriaga',
    materias: ['CIVIL'],
    especialidades: 'Arrendamiento, Posesión, Cobro de pesos',
    ubicacion: 'San Pedro Cholula',
    jurisdicciones: 'Puebla',
    idiomas: 'Español',
    aniosExperiencia: '3',
    modalidad: 'PRESENCIAL',
    honorariosDesde: '2000',
    honorariosHasta: '10000',
    disponibilidad: 'Lunes a sábado',
    semblanza: 'Atiendo asuntos civiles de personas y pequeños negocios de la zona.',
  },
  {
    situacion: 'pendiente',
    nombre: 'Mónica Treviño Salazar',
    materias: ['PENAL', 'AMPARO'],
    especialidades: 'Defensa penal, Amparo indirecto',
    ubicacion: 'Tlaxcala',
    jurisdicciones: 'Tlaxcala, Federal',
    idiomas: 'Español',
    aniosExperiencia: '10',
    modalidad: 'AMBAS',
    honorariosDesde: '7000',
    honorariosHasta: '50000',
    disponibilidad: 'Previa cita',
    semblanza: 'Litigo en materia penal y de amparo en Tlaxcala y tribunales federales.',
  },
  {
    situacion: 'pendiente',
    nombre: 'Julián Barragán Soto',
    materias: ['MERCANTIL'],
    especialidades: 'Sociedades, Títulos de crédito, Contratos',
    ubicacion: 'Puebla',
    jurisdicciones: 'Puebla',
    idiomas: 'Español, Inglés',
    aniosExperiencia: '8',
    modalidad: 'VIRTUAL',
    honorariosDesde: '6000',
    honorariosHasta: '40000',
    disponibilidad: 'Lunes a viernes de 11 a 20 h',
    semblanza:
      'Asesoro a emprendedores en la constitución y operación de sus sociedades.',
  },
]

const dos = (n: number) => String(n).padStart(2, '0')

export const ABOGADOS_DEMO: AbogadoDemo[] = BASE.map(({ situacion, ...resto }, i) => ({
  id: `demo-abogado-${dos(i + 1)}`,
  correo: `abogado${dos(i + 1)}@${DOMINIO_DEMO}`,
  situacion,
  formulario: { ...resto, cedula: `DEMO-${dos(i + 1)}` },
}))

export const ID_PERFIL_CLIENTE_DEMO = 'demo-cliente-01'
