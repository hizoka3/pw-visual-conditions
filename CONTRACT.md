# Package: pw/visual-conditions

**Versión:** 1.0.0
**Namespace:** `PW\VisualConditions`
**Propósito:** Selector visual de condiciones include/exclude para posts, pages y post types de WordPress, con múltiples filas de condición y búsqueda de items.

---

## Instalación

```json
"repositories": [
    {
        "type": "vcs",
        "url": "https://github.com/pw/visual-conditions"
    }
],
"require": {
    "pw/visual-conditions": "^1.0"
}
```

> Requiere que el plugin llame `VisualConditions::init()` en el hook `plugins_loaded` o posterior.

---

## Lo que el package expone

### Clase principal / Entry point

```php
use PW\VisualConditions\VisualConditions;

$vc = VisualConditions::init( array $config );
```

Es un singleton. Llamadas posteriores a `init()` retornan la misma instancia.

### Métodos públicos disponibles

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `init()` | `array $config` | `self` | Inicializa el package (singleton) |
| `render()` | `string $field_name`, `array $conditions = []` | `void` | Renderiza la UI del selector en el admin |
| `evaluate()` | `array $conditions` | `bool` | Evalúa si las condiciones guardadas aplican en el contexto actual |

### Config esperada en `init()`

```php
[
    'assets_url' => plugin_dir_url(__FILE__) . 'vendor/pw/visual-conditions/assets/', // requerido
    'version'    => '1.0.0',       // opcional, default: '1.0.0'
    'screens'    => ['toplevel_page_mi-plugin'], // opcional, restringe en qué pantallas admin se cargan los assets
]
```

### Hooks de WordPress que registra internamente

| Hook | Tipo | Prioridad | Descripción |
|------|------|-----------|-------------|
| `admin_enqueue_scripts` | action | 10 | Carga JS y CSS del selector |
| `wp_ajax_pw_vc_get_sources` | action | 10 | AJAX: retorna post types y fuentes disponibles |
| `wp_ajax_pw_vc_get_items` | action | 10 | AJAX: retorna posts/terms según fuente y búsqueda |

### Hooks que expone para que el plugin extienda

| Hook | Tipo | Parámetros | Descripción |
|------|------|------------|-------------|
| `pw_vc/sources` | filter | `array $sources` | Permite agregar o quitar fuentes del segundo dropdown |
| `pw_vc/items` | filter | `array $items, string $source, string $search` | Permite modificar los items del tercer dropdown |
| `pw_vc/evaluate_condition` | filter | `bool $match, string $source, array $items` | Permite implementar la lógica de evaluación por contexto |

---

## Lo que el package necesita del plugin

### Interfaces que el plugin debe implementar

Ninguna. La comunicación es via hooks de WordPress.

### Lo mínimo que el plugin debe hacer

```php
// 1. Implementar la evaluación de condiciones via filter
add_filter( 'pw_vc/evaluate_condition', function( $match, $source, $items ) {
    // Lógica del plugin para determinar si aplica en contexto actual
    return $match;
}, 10, 3 );

// 2. Guardar y recuperar las condiciones (el package solo renderiza y entrega el JSON)
// El plugin es responsable de persistir el valor del campo hidden con name=$field_name
```

---

## Restricciones y advertencias

- El package **NO** persiste las condiciones — solo renderiza la UI y entrega el JSON via input hidden. El plugin debe guardar y recuperar ese valor (post meta, option, etc.).
- El package **NO** implementa la evaluación de contexto por defecto — debe hacerse via el filter `pw_vc/evaluate_condition`.
- No tiene dependencias de otros packages del ecosistema `pw`.
- Versión mínima de PHP: `8.0`
- Versión mínima de WordPress: `6.0`
- Depende de jQuery (ya incluido en el admin de WordPress).

---

## Ejemplo de uso completo

```php
use PW\VisualConditions\VisualConditions;

// 1. Inicializar en plugins_loaded
add_action( 'plugins_loaded', function() {
    VisualConditions::init([
        'assets_url' => plugin_dir_url(__FILE__) . 'vendor/pw/visual-conditions/assets/',
        'screens'    => [ 'toplevel_page_mi-plugin' ],
    ]);
});

// 2. Renderizar en la página de settings
add_action( 'mi_plugin_render_settings', function() {
    $saved = get_option( 'mi_plugin_conditions', [] );
    VisualConditions::init()->render( 'mi_plugin_conditions', $saved );
});

// 3. Guardar al hacer submit
add_action( 'admin_post_mi_plugin_save', function() {
    $conditions = json_decode( sanitize_text_field( $_POST['mi_plugin_conditions'] ), true );
    update_option( 'mi_plugin_conditions', $conditions );
});

// 4. Evaluar en el frontend
add_action( 'template_redirect', function() {
    $conditions = get_option( 'mi_plugin_conditions', [] );
    $vc = VisualConditions::init();

    add_filter( 'pw_vc/evaluate_condition', function( $match, $source, $items ) {
        if ( $source === 'post__all' ) return is_singular( 'post' );
        if ( $source === 'post__specific' ) return is_singular() && in_array( get_the_ID(), $items );
        return $match;
    }, 10, 3 );

    if ( $vc->evaluate( $conditions ) ) {
        // Aplica la lógica del plugin
    }
});
```
