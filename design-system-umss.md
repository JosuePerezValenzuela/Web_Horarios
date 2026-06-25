# UMSS Design System — Portal Académico Integrado

## 1. Tema Visual y Atmósfera

El ecosistema de la Universidad Mayor de San Simón (UMSS) transmite una sensación institucional, moderna y altamente funcional. El lienzo base es un blanco muy limpio o dinámico (`bg-background`) en modo claro y un tono negro profundo (`#121212`) en modo oscuro para reducir la fatiga visual.

A diferencia de sistemas rígidos, la UMSS utiliza toques modernos de "Glassmorphism" sutil (fondos translúcidos con `backdrop-blur-sm` en tarjetas) y bordes muy redondeados (`rounded-4xl` en servicios) que suavizan la interacción. La jerarquía visual se establece mediante el contraste fuerte entre el **Azul Marino UMSS** y los acentos críticos en **Rojo San Simón**. El sistema evita colores brillantes innecesarios, enfocándose en la jerarquía de azules institucionales y la claridad tipográfica.

**Características Clave:**
- **Fondos Limpios:** Lienzo principal adaptativo. Las secciones "Hero" utilizan un sutil acento celeste (`#f8f9ff`).
- **Modo Oscuro Puro:** Fondos base en `#121212` (Near Black) con tarjetas elevadas en `#242424` o estructuras dinámicas, garantizando un contraste óptimo.
- **Tarjetas Flotantes:** Las tarjetas de servicio combinan bordes amplios con efectos de elevación al hacer hover (`-translate-y-1` y `shadow-xl`).
- **Iconografía Consistente:** Todo el sistema utiliza exclusivamente la librería **`lucide-react`** con un grosor de trazo (`stroke-width`) entre `2` y `2.5`.

---

## 2. Paleta de Colores y Roles

### Colores de Marca (Brand)
- **Primario (`#003770`):** Azul institucional base para la identidad corporativa.
- **Secundario / Acento (`#BC000C`):** Rojo San Simón. Usado en el escudo, alertas, botones de salida y estados activos/peligro de carácter crítico.
- **Azul Oscuro UMSS (`#001B47`):** Usado para encabezados de alto impacto y el bloque de texto del logo (muta a `text-foreground` o `#e0e0e0` en modo oscuro).
- **Azul Botón (`#002855`):** **El color interactivo y de acción principal**. Es el eje central para botones primarios, fondos de ítems activos/seleccionados en el Sidebar, Navbar y menús. (Hover: `#001b3a`).

### Superficies (Fondos) y Navegación
- **Background Claro (`#fdfdfd`):** Fondo principal en modo claro.
- **Hero Light (`#f8f9ff`):** Fondo ligeramente frío/celeste para secciones destacadas (muta a `#1a1a1a` en dark mode).
- **Background Oscuro (`#121212`):** Fondo principal en modo oscuro.
- **Superficies Elevadas (`#ffffff` / dark: `#242424`):** Tarjetas y popovers.
- **Paneles de Navegación (`bg-umss-side-bg`):** Fondo unificado para Navbar y Sidebar.
- **Estados Activos:** Se **prohíbe estrictamente el uso de azul celeste brillante** (`#3b82f6` o similares) en los estados activos de navegación para evitar parches genéricos. Todo ítem seleccionado debe usar `bg-umss-btn-blue` (`#002855`) con texto contrastante blanco en entorno de escritorio.

### Formularios y Estado
- **Focus Ring (`#175676`):** Azul acero para delinear inputs activos.
- **Éxito (`#2D5A27`):** Verde institucional para validaciones correctas.
- **Bordes (`#e5e7eb` / dark: `#333333` o `border-border`):** Divisiones estructurales suaves.

---

## 3. Reglas Tipográficas y Jerarquía

El sistema utiliza un trío tipográfico estratégico para separar la estructura, la lectura y los datos duros.

### A. Títulos Institucionales (`var(--font-roboto)`)
Usada para dar un carácter formal y con peso a la estructura de la página.
- **`umss-title-h1`:** `@apply font-roboto text-4xl md:text-5xl font-black tracking-tight text-umss-dark-blue dark:text-white;` (Para el título principal de una página).
- **`umss-title-h2`:** `@apply font-roboto text-2xl font-bold text-umss-dark-blue dark:text-gray-100;` (Para subtítulos de sección).
- **`umss-title-h3`:** `@apply font-roboto text-lg font-semibold text-gray-800 dark:text-gray-200;` (Para títulos dentro de tarjetas).

### B. Texto de Lectura e Interfaz (`var(--font-sans)`)
**Inter** es la fuente de trabajo pesada. Usada en el 90% de la interfaz por su máxima legibilidad.
- **Cuerpo de texto:** Descripciones, párrafos, instrucciones.
- **Controles UI:** Textos dentro de botones (`umss-btn-primary`), menús de navegación y etiquetas de formularios.

### C. Datos Exactos y Académicos (`var(--font-mono)`)
**Inter Mono** se utiliza exclusivamente para datos de ancho fijo, donde la alineación vertical y la claridad de los números es crítica. *(Uso sugerido: `@apply font-mono tracking-wider text-sm`)*.
- **Identificadores:** Código SIS, Carnet de Identidad (CI), Código Universitario (CU).
- **Kardex y Finanzas:** Calificaciones parciales/finales, promedios, montos de matrícula, o tokens de recibos (ej. `#TXN-8472`).
- **Píldoras/Badges:** Etiquetas de estado técnico (ej. `[ EN PROCESO ]`, `[ APROBADO ]`).

---

## 4. Estilos de Componentes (Utilities de Tailwind v4)

### Botones y Acciones
- **`umss-btn-primary`:** Fondo Azul Botón (`bg-umss-btn-blue`), texto blanco, sombra media. El botón de acción por defecto.
- **`umss-btn-outline`:** Borde de 2px Azul Botón. En hover invierte a fondo blanco sólido. Adaptable en modo oscuro.
- **`umss-btn-danger`:** Fondo Rojo San Simón (`#BC000C`), texto blanco. Usado para acciones destructivas.
- **`umss-btn-ghost`:** Variante para menús laterales o botones secundarios (como "CERRAR SESIÓN" colapsado), manteniendo el texto en color `secondary` (rojo) o neutral con hover institucional.
- **`umss-btn-login` / `umss-btn-logout`:** Variantes sobredimensionadas (`py-8 text-lg`) para las pantallas de autenticación.

### Contenedores y Tarjetas
- **`umss-hero-section`:** Contenedor de pantalla completa (`min-h-screen`) con padding superior compensado para la Navbar (`pt-24`) y fondo mapeado `umss-bg-light-hero`.
- **`umss-card-service`:** Tarjeta principal de los módulos. Esquinas súper redondeadas (`rounded-4xl`), fondo al 90% de opacidad para efecto cristal (`backdrop-blur-sm`), y transición de elevación en hover.

### Formularios
- **`umss-input`:** Input institucional. Incluye padding amplio (`py-3`), transición a focus ring azul (`form-focus`), y fuerza el texto a `uppercase` automáticamente para estandarizar registros.
- **`umss-select`:** Select estandarizado que hace match perfecto con la altura y foco del `umss-input`.

### Navegación (Sidebar & Navbar)
- **`umss-navbar`:** Contenedor fijo superior (`h-16 z-50`) con fondo e hilos de borde adaptativos.
- **`umss-navbar-link` / `umss-navbar-link-active`:** Enlaces de cabecera con indicadores de borde inferior (`border-secondary` para activos).
- **`umss-sidebar-item`:** Elemento de menú. Padding vertical generoso (`py-3`), esquinas `rounded-lg`, hover interactivo (`umss-side-hover-bg`) que ilumina iconos neutrales (`text-muted-foreground`) a color institucional.
- **`umss-sidebar-item-active`:** Ítem activo unificado. Utiliza **estrictamente** fondo Azul Botón (`bg-umss-btn-blue`) y texto blanco forzado. En móviles, resalta en negrita con el color azul institucional o blanco según el modo activo, eliminando colores celestes heredados.

### Notificaciones (Toasts)
El sistema utiliza `Sonner` con variables globales sobreescritas:
- Bordes extremos (`border-radius: 20px`).
- Sombras profundas para separar las alertas del contenido base.
- En modo oscuro, adoptan el fondo `#242424` con bordes `#333333`.

---

## 5. Directrices de Diseño (Do's & Don'ts)

### ✅ Hacer (Do's)
- **Usar `lucide-react` para iconos:** Mantener un `size={18}` o `20` con un `strokeWidth` de 2 para mantener el aspecto afilado y técnico.
- **Respetar el modo oscuro nativo:** Usa las variables globales (`bg-background`, `text-foreground`, `bg-card`, `border-border`) en lugar de colores fijos para que el theme cambie automáticamente.
- **Aplicar `Inter Mono` para números:** Si muestras el Código SIS de un estudiante o sus notas en una tabla, usa la fuente monoespaciada para evitar que las columnas bailen.
- **Inputs en Mayúsculas:** Permite que `umss-input` transforme visualmente el texto para estandarizar registros.
- **Mantener el Azul Marino institucional:** El azul profundo (`#002855`) es el único color primario autorizado para botones activos e interacciones de menús.

### ❌ No Hacer (Don'ts)
- **No mezclar tipografías al azar:** Nunca uses Roboto para un párrafo largo, ni Inter para un título H1 principal. 
- **No inventar colores ni usar celestes brillantes:** Queda prohibido meter azules genéricos de Tailwind (`bg-blue-500`, `bg-primary`, `text-blue-400`) en elementos activos del Sidebar/Navbar que rompan la paleta sobria de la universidad.
- **No modificar el radio del Sidebar:** El Sidebar debe sentirse estructural, no lo redondees flotando en el medio de la pantalla.

---

## 6. Guía de Prompts para Agentes IA

Cuando pidas la generación de nuevas vistas o páginas, incluye estas instrucciones al agente:

- **Contenedor Principal:** "Usa la clase `umss-hero-section` para la vista raíz."
- **Uniformidad de Color:** "Utiliza exclusivamente `umss-btn-blue` (`#002855`) para todos los elementos activos, botones primarios y estados seleccionados. Prohibido por completo el uso de azules claros, celestes o tonos neón en componentes estructurales."
- **Jerarquía de Texto:** "Usa las clases de tipografía del sistema: `font-roboto` para títulos (`text-2xl` a `text-4xl`), `font-sans` para párrafos y botones, y obliga el uso de `font-mono` para cualquier Código SIS, Carnet de Identidad o nota numérica."
- **Tarjetas:** "Renderiza una grilla usando clases atómicas de Tailwind y aplica la utilidad `umss-card-service` a cada tarjeta. Añade un icono de `lucide-react`."
- **Formularios:** "Construye formularios usando `umss-input` y `umss-select`. Asegúrate de que el botón de submit use la clase `umss-btn-primary`."