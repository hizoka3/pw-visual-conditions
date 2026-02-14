<?php
// src/Admin/AssetsManager.php

namespace PW\VisualConditions\Admin;

class AssetsManager
{
	private array $config;

	public function __construct(array $config)
	{
		$this->config = $config;
	}

	public function enqueue(): void
	{
		// Only enqueue on the screens defined by the plugin consuming this package
		$screens = $this->config["screens"] ?? [];
		if (!empty($screens) && !$this->is_allowed_screen($screens)) {
			return;
		}

		$base_url = $this->config["assets_url"] ?? $this->resolve_assets_url();
		$version = $this->config["version"] ?? "1.0.0";

		wp_enqueue_style(
			"pw-visual-conditions",
			$base_url . "css/visual-conditions.css",
			[],
			$version,
		);

		wp_enqueue_script(
			"pw-visual-conditions",
			$base_url . "js/visual-conditions.js",
			["jquery"],
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
