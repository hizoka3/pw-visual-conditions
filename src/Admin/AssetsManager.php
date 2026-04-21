<?php
// src/Admin/AssetsManager.php

namespace PW\VisualConditions\Admin;

class AssetsManager
{
	private const SELECT2_VERSION = "4.1.0-rc.0";

	private array $config;

	public function __construct(array $config)
	{
		$this->config = $config;
	}

	public function enqueue(): void
	{
		// Only enqueue on the screens defined by the plugin consuming this package
		$screens = $this->config["screens"] ?? [];
		if (empty($screens)) {
			return;
		}
		if (!$this->is_allowed_screen($screens)) {
			return;
		}

		$base_url = $this->config["assets_url"] ?? $this->resolve_assets_url();
		$version = $this->config["version"] ?? "1.0.0";

		$select2_base =
			"https://cdn.jsdelivr.net/npm/select2@" . self::SELECT2_VERSION . "/dist/";

		wp_enqueue_style(
			"pw-vc-select2",
			$select2_base . "css/select2.min.css",
			[],
			self::SELECT2_VERSION,
		);

		wp_enqueue_script(
			"pw-vc-select2",
			$select2_base . "js/select2.min.js",
			["jquery"],
			self::SELECT2_VERSION,
			true,
		);

		wp_enqueue_style(
			"pw-visual-conditions",
			$base_url . "css/visual-conditions.css",
			["pw-vc-select2"],
			$version,
		);

		wp_enqueue_script(
			"pw-visual-conditions",
			$base_url . "js/visual-conditions.js",
			["jquery", "pw-vc-select2"],
			$version,
			true,
		);
	}

	private function is_allowed_screen(array $screens): bool
	{
		$current_screen = get_current_screen();
		if (!$current_screen) {
			return false;
		}

		return in_array($current_screen->id, $screens, true);
	}

	private function resolve_assets_url(): string
	{
		// Fallback: resolve from this file's location
		$path = plugin_dir_url(__FILE__);
		return str_replace("src/Admin/", "assets/", $path);
	}
}
