import { Link } from 'react-router-dom'
import { Desglose } from '../contratos/Desglose'
import { backendConfigurado } from '../../app/amplify'
import { EJEMPLO_HONORARIOS, INCLUIRA, PROXIMAMENTE, RECORRIDO } from './contenido'

export function Landing() {
  return (
    <>
      <section className="portada">
        <div className="contenedor portada__rejilla">
          <div className="portada__texto">
            <h1 className="titulo-pagina">
              Encuentra al abogado adecuado y gestiona tu asunto en un solo lugar
            </h1>
            <p className="entrada">
              Specter reúne la búsqueda, la contratación, la comunicación y el expediente
              de un asunto jurídico. Los abogados pasan por una revisión antes de aparecer
              en la red.
            </p>
            <div className="acciones">
              <a className="boton boton--primario" href="#alcance">
                Ver qué incluye
              </a>
              <a className="boton boton--secundario" href="#recorrido">
                Ver el recorrido
              </a>
            </div>
            {backendConfigurado ? (
              <p className="nota">
                <Link to="/ingresar">Crea una cuenta o ingresa</Link> para probar el
                prototipo.
              </p>
            ) : (
              <p className="nota">
                El registro y el inicio de sesión se habilitan en la siguiente entrega del
                prototipo.
              </p>
            )}
          </div>

          <ol
            className="recorrido"
            id="recorrido"
            aria-label="Recorrido de un asunto en Specter"
          >
            {RECORRIDO.map((etapa) => (
              <li key={etapa}>{etapa}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="seccion seccion--banda" id="alcance">
        <div className="contenedor">
          <h2 className="titulo-seccion">Qué incluirá el primer prototipo</h2>
          <p className="entrada entrada--centrada">
            Un flujo completo de punta a punta, con datos de demostración. Lo que sigue
            está en construcción y se irá activando en cada entrega.
          </p>

          <div className="alcance">
            <div>
              <h3>En construcción</h3>
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
        <div className="contenedor contenedor--angosto texto-centro">
          <h2 className="titulo-seccion">Sigue la construcción</h2>
          <p className="entrada entrada--centrada">
            El código y la documentación del prototipo son públicos. Cada entrega se
            publica en esta misma dirección.
          </p>
          <a
            className="boton boton--claro"
            href="https://github.com/netfoor/specter"
            rel="noreferrer"
          >
            Ver el repositorio
          </a>
        </div>
      </section>
    </>
  )
}
