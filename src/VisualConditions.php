<?php
// src/VisualConditions.php

namespace PW\VisualConditions;

use PW\VisualConditions\Conditions\ConditionResolver;
use PW\VisualConditions\Admin\AssetsManager;

class VisualConditions
{
	private static ?self $instance = null;
	private ConditionResolver $resolver;
	private AssetsManager $assets;
	private array $config;

	private function __construct(array $config)
	{
		$this->config = $config;
		$this->resolver = new ConditionResolver();
		$this->assets = new AssetsManager($config);
	}

	public static function init(array $config = []): self
	{
		if (self::$instance === null) {
			self::$instance = new self($config);
			self::$instance->boot();
		}
		return self::$instance;
	}

	private function boot(): void
	{
		add_action("admin_enqueue_scripts", [$this->assets, "enqueue"]);
		add_action("wp_ajax_pw_vc_get_sources", [$this, "ajax_get_sources"]);
		add_action("wp_ajax_pw_vc_get_items", [$this, "ajax_get_items"]);
	}

	/**
	 * Render the conditions UI.
	 * Call this inside your admin page where you need the selector.
	 *
	 * @param string $field_name  Name attribute for the hidden input that stores the conditions JSON.
	 * @param array  $conditions  Existing conditions to pre-populate (from saved meta/option).
	 */
	public function render(string $field_name, array $conditions = []): void
	{
		$data = [
			"fieldName" => $field_name,
			"conditions" => $conditions,
			"nonce" => wp_create_nonce("pw_vc_nonce"),
			"ajaxUrl" => admin_url("admin-ajax.php"),
		];

		include __DIR__ . "/../views/conditions-ui.php";
	}

	/**
	 * Evaluate saved conditions against current context.
	 * Returns true if conditions pass, false otherwise.
	 *
	 * @param array $conditions  Saved conditions array (decoded from JSON).
	 */
	public function evaluate(array $conditions): bool
	{
		return $this->resolver->evaluate($conditions);
	}

	/**
	 * AJAX: Returns available sources (post types, pages, taxonomies, etc.)
	 */
	public function ajax_get_sources(): void
	{
		check_ajax_referer("pw_vc_nonce", "nonce");

		$sources = apply_filters(
			"pw_vc/sources",
			$this->resolver->get_sources(),
		);

		wp_send_json_success($sources);
	}

	/**
	 * AJAX: Returns items for a given source (e.g. list of posts for a post type).
	 */
	public function ajax_get_items(): void
	{
		check_ajax_referer("pw_vc_nonce", "nonce");

		$source = sanitize_text_field($_POST["source"] ?? "");
		$search = sanitize_text_field($_POST["search"] ?? "");

		$items = apply_filters(
			"pw_vc/items",
			$this->resolver->get_items($source, $search),
			$source,
			$search,
		);

		wp_send_json_success($items);
	}
}
