# Diseño de Specter

Interfaz limpia al estilo de las apps de iOS, con patrones que la gente ya usa en apps de mensajería y redes sociales. La meta: que se sienta familiar desde la primera vez, sin copiar el aspecto de ninguna marca.

Los tokens viven en `src/ui/tokens.css` y los estilos en `src/ui/base.css`. Ningún color fuera de los tokens.

## Color

Familia de azul acero derivada del color de marca `#7191A8`.

| Token | Valor | Uso | Contraste sobre blanco |
|---|---|---|---|
| `--tinta` / `--marca-profunda` | `#13283D` | Títulos, texto, banda oscura | 15.0:1 |
| `--marca` | `#35536A` | Botones, enlaces, mensajes propios | 8.1:1 |
| `--marca-logo` | `#7191A8` | Logo, adornos, foco, avatares | 3.3:1, nunca para texto |
| `--tinta-2` | `#4A5B6B` | Texto secundario | 7.0:1 |
| `--gris` | `#5C6B79` | Notas | 5.5:1 |
| `--bruma` | `#E7EEF4` | Etiquetas, fondos suaves | |
| `--banda` | `#F2F4F7` | Fondo agrupado detrás de tarjetas | |
| `--aviso-color` | `#C2410C` | Solo insignias de no leído | 5.2:1 |

Los avatares llevan iniciales en marino, nunca en blanco: el blanco sobre `#7191A8` no cumple contraste.

## Letra

San Francisco en dispositivos Apple e Inter (alojada en el proyecto con `@fontsource-variable/inter`) en los demás. La caligráfica Holyday solo aparece dentro del logotipo, que es una imagen.

## Íconos

[Lucide](https://lucide.dev) (`lucide-react`, licencia ISC): trazo de 2 px y esquinas redondas. La pestaña activa usa un trazo más grueso.

## Patrones

| Pantalla | Patrón familiar |
|---|---|
| Navegación con sesión en el teléfono | Barra de pestañas inferior por rol (`src/ui/Pestanas.tsx`) |
| Mi espacio | Mosaico de accesos con ícono |
| Directorio y coincidencias | Lista de filas con avatar y palomita de verificado |
| Perfil del abogado | Cabecera con foto, tres cifras y nombre con palomita, como un perfil de red social |
| NIA y expediente | Burbujas de mensajería: propias a la derecha en acero profundo, recibidas a la izquierda |
| Comparar | Barra de acción flotante |
| Datos de una ficha | Filas agrupadas, como los ajustes de iOS |

## Reglas

- Botones en píldora de al menos 48 px de alto; filtros y estados como etiquetas en píldora.
- Tarjetas con radio de 14 a 22 px sobre fondo `--banda`, sin sombra salvo en lo que flota.
- Una sola animación de entrada (la ilustración de la portada), desactivada con `prefers-reduced-motion`.
- Nada que el producto no haga: sin contadores de no leídos ni datos inventados en las pantallas reales. Los ejemplos de la portada dicen «Ejemplo ilustrativo».
