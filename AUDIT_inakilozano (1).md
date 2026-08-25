# Auditoría sincera — inakilozano.com *(v2 corregida)*
**Fecha:** 21 de agosto de 2026 · **Alcance:** sitio completo (8 secciones en desktop 1440px + mobile 390px, performance, errores JS, carga diferida verificada con esperas de 5–7 s)
**Método:** crawler Playwright + revisión visual + click-through de todas las secciones + inspección de red (`/api/projects`, `/api/blogs`).

> Veredicto en una frase: **diseño limpio y contenido real y sólido — pero el contenido tarda 5–7 segundos en aparecer tras cada clic, así que la mayoría de los visitantes se va convencida de que las secciones están vacías.**

---

## ⚠️ Corrección v1 → v2
La primera versión de esta auditoría afirmaba que Proyectos, Blog y Contacto estaban vacíos. **Es falso**: el contenido existe (8 proyectos, blog con ensayos bilingües + newsletter, contacto con email/GitHub/LinkedIn/formulario) pero se carga de forma diferida vía API y tarda demasiado en renderizar. El problema real es de **latencia percibida**, no de contenido.

---

## 1. Resumen ejecutivo

| Dimensión | Nota (1–10) | Comentario |
|---|---|---|
| Diseño visual | 7 | Papel cuadriculado + Inter + acento rojo consistente |
| Usabilidad | 4 | Contenido clave con 5–7 s de retraso; sin URLs por sección |
| Inteligibilidad | 6 | Textos claros pero genéricos ("soluciones innovadoras") |
| AI slop | 3 | Emojis en headings/bullets; ChatGPT como skill y tag de proyectos |
| Contenido | 7 | 8 proyectos reales (FloodRisk incluido), blog vivo con voz propia |
| Performance | 5 | Payload liviano (231 KB) pero TTFB ~2,4 s y secciones lentas |
| Accesibilidad | 6 | Skip link ✓; carrusel con foco a revisar |

**Problemas críticos:**
1. **Latencia de secciones: 5–7 s** para que aparezca el contenido de Proyectos/Blog/Contacto. Un reclutador ve un slide vacío y clickea afuera antes de que cargue.
2. **Emoji-slop**: 🚀💡🤖⚙️🖥️ en H1/párrafos; 🖊️🗄️ en bullets laborales.
3. **Title duplicado**: "Iñaki F. Lozano | … | Iñaki F. Lozano".
4. **Carrusel sin URLs por sección** (SEO + compartibilidad rotas).

---

## 2. Qué tiene el sitio (inventario real verificado)

- **Inicio:** hero personal bien escrito.
- **Sobre mí:** narrativa profesional genuina (2 años de industria).
- **Educación:** Ing. en Computación UNT ("3 exámenes restantes") + secundario (abanderado).
- **Experiencia:** Software Engineer SSr @ Tribunal de Cuentas de Tucumán + backend trainee en startup.
- **Habilidades:** 33 skills filtrables por categoría.
- **Proyectos:** ✅ **8 tarjetas reales** con thumbnail profesional, descripción, stack y link: Sistema de Factoring, CMS Bienes Raíces bilingüe, **FloodRisk**, ComplySt, Juntaditas, Empanaditas, ticket-booking, IL-RE… Carrusel de 3 visibles con filtros por tecnología.
- **Blog:** ✅ **posts ensayísticos propios y bilingües** ("La Sangre de lo Inevitable", "Los orígenes computacionales de la inteligencia", "El jinete nunca estuvo ahí") + suscripción por email EN/ES.
- **Contacto:** ✅ email visible (mailto), GitHub, LinkedIn y formulario completo (nombre/email/mensaje con contadores).

---

## 3. Hallazgos detallados

### 3.1 Latencia de contenido = sección "vacía" para el usuario (CRÍTICO)
Proyectos/Blog/Contacto fetchean `/api/projects` y `/api/blogs` al entrar al slide y tardan **5–7 s en renderizar** (verificado con esperas controladas; con 1–2 s el slide aparece vacío). En la práctica: el visitante que evalúa contratar ve vacío, no espera.
- **Arreglo:** precargar los datos de todas las secciones en el primer load (el JSON completo pesa poco) o mostrar skeletons inmediatos; objetivo <500 ms.

### 3.2 Emoji-slop (ALTO)
H1 con dos emojis; casi cada párrafo uno; bullets de experiencia laboral con 🖊️🗄️🧑‍💻. Para un perfil que vende "arquitectura limpia y backend escalable" el formato contradice el mensaje y lee como generado-con-IA. Además **ChatGPT figura como skill y como tag en 4 proyectos** — debilita un stack que ya tiene Docker, GCP, Django, Node, PostgreSQL reales.
- **Arreglo:** cero emojis en headings/cuerpo/bullets; sacar ChatGPT de skills y de los tags de proyectos.

### 3.3 Carrusel sin URLs (ALTO)
Todo son slides ←/→: sin rutas propias → SEO débil, imposible compartir "/proyectos" o un post del blog por link directo.
- **Arreglo:** rutas reales por sección (o al menos hash-sync `#/proyectos`).

### 3.4 Sobrecarga de tags en las cards de proyecto (MEDIO)
Cada card lista **hasta 15 tecnologías**, incluyendo obviedades (Git, GitHub, HTML5, CSS3). El signal real se pierde entre el ruido.
- **Arreglo:** máx. 4–5 tags diferenciantes por card (p. ej. FloodRisk: Next.js · Leaflet · SMN/INA APIs · Vercel).

### 3.5 Detalles técnicos (BAJO/MEDIO)
- Title duplicado (marca dos veces).
- TTFB ~2,4 s (probable cold start); payload total liviano (231 KB) ✓.
- Sin overflow horizontal en mobile ✓; sin errores JS ✓.
- Categorías del filtro de skills en inglés en sitio ES ("Todas 33 · Ai 2 · Database 4").
- Inconsistencia narrativa: meta description dice "estudiante"; experiencia dice SSr.

---

## 4. Qué está bien (para ser justos)

- **Los 8 proyectos son reales y variados**, con thumbnails profesionales y links — muy por encima del portfolio promedio de estudiante.
- **El blog tiene voz propia** (ensayos sobre identidad Argentina y origen computacional de la IA), bilingüe y con newsletter. Diferenciador genuino.
- **Contacto completo**: mailto + GitHub + LinkedIn + formulario con validación y contadores.
- Identidad visual coherente (grilla de cuaderno + rojo), Inter bien usada.
- Experiencia laboral concreta y creíble (Tribunal de Cuentas: firmas digitales, expedientes, interoperabilidad).
- Sitio liviano, accesible (skip link), sin errores JS.

---

## 5. Plan de acción priorizado (v2)

| # | Acción | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Precargar datos de todas las secciones (o skeletons) — contenido visible <500 ms | S | **Muy alto** |
| 2 | Cero emojis en headings/párrafos/bullets | XS | Alto |
| 3 | Sacar ChatGPT de skills y tags de proyectos | XS | Alto |
| 4 | Máx. 4–5 tags por card de proyecto | XS | Medio |
| 5 | Rutas/hash por sección para deep-linking | M | Alto |
| 6 | Arreglar title duplicado; calentar hosting para bajar TTFB | S | Medio |
| 7 | Narrativa única: "Software Engineer SSr · UNT (cierre)" + categorías de skills al español | XS | Medio |

---

## 6. Conclusión

Con el contenido verificado, el diagnóstico mejora sustancialmente: hay **8 proyectos reales, un blog con voz propia y contacto completo**. El problema ya no es de contenido sino de **entrega**: todo eso tarda demasiado en mostrarse, y en un portfolio el tiempo de atención se mide en segundos. La regla es simple — *si tarda más de 1 segundo en aparecer, no existe*. Con precarga de datos y una limpieza de emojis/tags, este sitio convence a un tech lead tal como está diseñado.

---

*Auditoría v2 generada a partir de: navegación completa de las 8 secciones (desktop + mobile), esperas controladas de 5–7 s por sección, inspección de requests de red, métricas de performance y capturas visuales.*
