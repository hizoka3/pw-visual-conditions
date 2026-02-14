<?php
// views/conditions-ui.php

/**
 * View: Conditions UI
 *
 * Available variables:
 * @var string $field_name   Hidden input name to store conditions JSON
 * @var array  $conditions   Pre-existing conditions
 * @var string $nonce        WP nonce for AJAX
 * @var string $ajax_url     Admin AJAX URL
 */
?>
<div
    class="pw-vc-wrapper"
    data-field-name="<?php echo esc_attr($data["fieldName"]); ?>"
    data-nonce="<?php echo esc_attr($data["nonce"]); ?>"
    data-ajax-url="<?php echo esc_url($data["ajaxUrl"]); ?>"
    data-conditions="<?php echo esc_attr(
    	wp_json_encode($data["conditions"]),
    ); ?>"
>
    <div class="pw-vc-rows">
        <!-- JS renders condition rows here -->
    </div>

    <button type="button" class="button pw-vc-add-condition">
        + <?php esc_html_e("Add Condition", "pw-vc"); ?>
    </button>

    <input
        type="hidden"
        name="<?php echo esc_attr($data["fieldName"]); ?>"
        class="pw-vc-input"
        value="<?php echo esc_attr(wp_json_encode($data["conditions"])); ?>"
    >
</div>
