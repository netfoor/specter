import {
  CircleDollarSign,
  FileCheck,
  FileText,
  FolderOpen,
  History,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Desglose } from '../contratos/Desglose'
import { backendConfigurado } from '../../app/amplify'
import { EJEMPLO_HONORARIOS, FASES, INCLUIRA, PROXIMAMENTE, RECORRIDO } from './contenido'

const ICONO_FASE = [Search, FileCheck, FolderOpen]
const ULTIMA_ETAPA = RECORRIDO[RECORRIDO.length - 1]

export function Landing() {
  return (
    <>
      <section className="portada">
        <div className="contenedor portada__rejilla">
          <div className="portada__texto">
            <p className="distintivo">
              <ShieldCheck size={16} aria-hidden="true" />
              Abogados revisados por Specter
            </p>
            <h1 className="titulo-pagina">
              Encuentra al abogado adecuado y lleva tu asunto en un solo lugar
            </h1>
            <p className="entrada">
              Cuéntanos qué pasa. NIA te ayuda a ordenar tu caso, te mostramos abogados
              compatibles y, al contratar, todo sigue en un expediente compartido con chat
              y documentos.
            </p>
            {backendConfigurado ? (
              <div className="acciones">
                <Link className="boton boton--primario" to="/mi-espacio/asuntos/nuevo">
                  Describir mi caso
                </Link>
                <Link className="boton boton--secundario" to="/abogados">
                  Ver abogados
                </Link>
              </div>
            ) : (
              <>
                <div className="acciones">
                  <a className="boton boton--primario" href="#alcance">
                    Ver qué incluye
                  </a>
                  <a className="boton boton--secundario" href="#recorrido">
                    Cómo funciona
                  </a>
                </div>
                <p className="nota">
                  El registro y el inicio de sesión se habilitan en la siguiente entrega
                  del prototipo.
                </p>
              </>
            )}
          </div>

          <div className="portada__ilustracion">
            <img
              src="/logotipo.png"
              alt="Ilustración de la justicia con los ojos vendados sosteniendo una balanza, junto a la palabra specter"
              width={500}
              height={500}
            />
          </div>
        </div>
      </section>

      <section className="seccion seccion--banda" id="recorrido">
        <div className="contenedor">
          <h2 className="titulo-seccion">
            De la duda a la conclusión, sin perder el hilo
          </h2>
          <p className="entrada entrada--centrada">
            Nueve pasos agrupados en tres momentos. Siempre sabes en cuál vas.
          </p>
          <div
            className="fases"
            role="group"
            aria-label="Recorrido de un asunto en Specter"
          >
            {FASES.map(({ nombre, etapas }, i) => {
              const Icono = ICONO_FASE[i]
              return (
                <div className="fase" key={nombre}>
                  <span className="fase__icono">
                    <Icono size={24} aria-hidden="true" />
                  </span>
                  <h3>{nombre}</h3>
                  <ol className="recorrido">
                    {etapas.map((etapa) => (
                      <li
                        key={etapa}
                        className={
                          etapa === ULTIMA_ETAPA ? 'recorrido__final' : undefined
                        }
                      >
                        {etapa}
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor dos-columnas">
          <div>
            <h2 className="titulo-seccion titulo-seccion--izquierda">
              Todo tu asunto en una conversación
            </h2>
            <p className="entrada">
              Al contratar se abre un expediente privado entre tú y tu abogado: mensajes
              en tiempo real, documentos y cada avance registrado. Solo ustedes dos lo
              ven.
            </p>
            <ul className="ventajas">
              <li>
                <LockKeyhole size={22} aria-hidden="true" />
                Documentos privados con enlaces de descarga temporales
              </li>
              <li>
                <CircleDollarSign size={22} aria-hidden="true" />
                Honorarios y desglose claros antes de aceptar
              </li>
              <li>
                <History size={22} aria-hidden="true" />
                Bitácora de cada actuación
              </li>
            </ul>
          </div>
          <figure className="chat-ejemplo">
            <figcaption>Ejemplo ilustrativo</figcaption>
            <p className="nia__mensaje">
              Hola, ya revisé tu caso. ¿Me compartes el acta de matrimonio?
            </p>
            <p className="nia__mensaje nia__mensaje--usuario">Claro, aquí está.</p>
            <p className="nia__mensaje nia__mensaje--usuario">
              <span>
                <FileText size={14} aria-hidden="true" /> acta-matrimonio.pdf
              </span>
            </p>
          </figure>
        </div>
      </section>

      <section className="seccion seccion--banda" id="alcance">
        <div className="contenedor">
          <h2 className="titulo-seccion">Qué incluye el prototipo</h2>
          <p className="entrada entrada--centrada">
            Un flujo completo de punta a punta, con datos de demostración. Lo que sigue se
            irá activando en cada entrega.
          </p>

          <div className="alcance">
            <div>
              <h3>Disponible</h3>
              <ul className="lista-lineas">
                {INCLUIRA.map(({ titulo, detalle }) => (
                  <li key={titulo}>
                    <strong>{titulo}</strong>
                    <span>{detalle}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Próximamente</h3>
              <p className="nota nota--tope">
                Estas capacidades no existen todavía y no forman parte del prototipo.
              </p>
              <ul className="lista-lineas lista-lineas--tenue">
                {PROXIMAMENTE.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="seccion" id="desglose">
        <div className="contenedor contenedor--angosto">
          <h2 className="titulo-seccion">Cada monto, con su desglose</h2>
          <p className="entrada entrada--centrada">
            Antes de aceptar un contrato verás cuánto cobra el abogado, cuánto retiene
            Specter y cuánto recibe el abogado.
          </p>
          <Desglose
            honorarios={EJEMPLO_HONORARIOS}
            leyenda="Ejemplo ilustrativo. No es una oferta ni un cobro."
          />
          <p className="nota">
            El modelo de comisión y el tratamiento fiscal siguen en definición. En el
            prototipo no se cobra ni se mueve dinero.
          </p>
        </div>
      </section>

      <section className="seccion seccion--banda" id="nia">
        <div className="contenedor contenedor--angosto">
          <h2 className="titulo-seccion">NIA te orienta, el abogado te asesora</h2>
          <p className="entrada entrada--centrada">
            NIA explica conceptos en lenguaje sencillo, propone a qué materia pertenece tu
            problema y te ayuda a ordenar la información antes de contactar a un abogado.
          </p>
          <p className="aviso">
            NIA no sustituye a un abogado ni presta servicios jurídicos. Cuando tu asunto
            necesita asesoría, te recomienda contratar a un profesional.
          </p>
        </div>
      </section>

      <section className="seccion seccion--marca">
        <div className="contenedor banda-abogados">
          <div>
            <h2 className="titulo-seccion">¿Eres abogado?</h2>
            <p className="entrada">
              Crea tu perfil, recibe solicitudes de asuntos que coinciden con tu práctica
              y lleva cada expediente desde el teléfono.
            </p>
          </div>
          {backendConfigurado ? (
            <Link className="boton boton--claro" to="/ingresar?registro">
              Crear mi perfil
            </Link>
          ) : (
            <a
              className="boton boton--claro"
              href="https://github.com/netfoor/specter"
              rel="noreferrer"
            >
              Ver el repositorio
            </a>
          )}
        </div>
      </section>
    </>
  )
}
