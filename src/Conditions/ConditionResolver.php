<?php
// src/Conditions/ConditionResolver.php

namespace PW\VisualConditions\Conditions;

class ConditionResolver
{
	/**
	 * Returns all available sources grouped by type.
	 * Structure mirrors what the UI needs to render the second dropdown.
	 *
	 * @return array<string, array{ label: string, children: array }>
	 */
	public function get_sources(): array
	{
		$sources = [];

		// Singular pages
		$sources["singular"] = [
			"label" => __("General", "pw-vc"),
			"children" => [
				[
					"key" => "all_singular",
					"label" => __("All Singular", "pw-vc"),
				],
				["key" => "front_page", "label" => __("Front Page", "pw-vc")],
				["key" => "404", "label" => __("404 Page", "pw-vc")],
			],
		];

		// Public post types
		$post_types = get_post_types(["public" => true], "objects");
		foreach ($post_types as $post_type) {
			$sources[$post_type->name] = [
				"label" => $post_type->labels->singular_name,
				"children" => [
					[
						"key" => $post_type->name . "__all",
						"label" => sprintf(
							__("All %s", "pw-vc"),
							$post_type->labels->name,
						),
						"searchable" => false,
					],
					[
						"key" => $post_type->name . "__specific",
						"label" => sprintf(
							__("Specific %s", "pw-vc"),
							$post_type->labels->singular_name,
						),
						"searchable" => true,
						"source" => $post_type->name,
					],
				],
			];

			// Add taxonomy children if the post type has public taxonomies
			$taxonomies = get_object_taxonomies($post_type->name, "objects");
			foreach ($taxonomies as $taxonomy) {
				if (!$taxonomy->public) {
					continue;
				}

				$sources[$post_type->name]["children"][] = [
					"key" => $post_type->name . "__tax_" . $taxonomy->name,
					"label" => sprintf(
						__("In %s", "pw-vc"),
						$taxonomy->labels->singular_name,
					),
					"searchable" => true,
					"source" => "taxonomy__" . $taxonomy->name,
				];
			}
		}

		return $sources;
	}

	/**
	 * Returns items for a given source key (for the third searchable dropdown).
	 *
	 * @param string $source  Source key, e.g. 'post', 'taxonomy__category'
	 * @param string $search  Optional search term
	 * @return array<array{ id: int|string, label: string }>
	 */
	public function get_items(string $source, string $search = ""): array
	{
		// Taxonomy source
		if (str_starts_with($source, "taxonomy__")) {
			$taxonomy = str_replace("taxonomy__", "", $source);
			return $this->get_taxonomy_terms($taxonomy, $search);
		}

		// Post type source
		return $this->get_posts($source, $search);
	}

	/**
	 * Evaluate saved conditions against current WordPress context.
	 *
	 * @param array $conditions  Array of condition rows.
	 * @return bool
	 */
	public function evaluate(array $conditions): bool
	{
		if (empty($conditions)) {
			return true;
		}

		foreach ($conditions as $condition) {
			$operator = $condition["operator"] ?? "include";
			$source = $condition["source"] ?? "";
			$items = $condition["items"] ?? [];

			$match = $this->matches($source, $items);

			if ($operator === "include" && $match) {
				return true;
			}
			if ($operator === "exclude" && $match) {
				return false;
			}
		}

		return false;
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	private function matches(string $source, array $items): bool
	{
		// To be implemented with full context evaluation (is_singular, is_tax, etc.)
		// Placeholder for scaffold — implement per use case or extend via filter.
		return apply_filters(
			"pw_vc/evaluate_condition",
			false,
			$source,
			$items,
		);
	}

	private function get_posts(string $post_type, string $search): array
	{
		$args = [
			"post_type" => $post_type,
			"post_status" => "publish",
			"posts_per_page" => 20,
			"s" => $search,
		];

		$posts = get_posts($args);

		return array_map(
			fn($post) => [
				"id" => $post->ID,
				"label" => $post->post_title,
			],
			$posts,
		);
	}

	private function get_taxonomy_terms(string $taxonomy, string $search): array
	{
		$terms = get_terms([
			"taxonomy" => $taxonomy,
			"hide_empty" => false,
			"search" => $search,
			"number" => 20,
		]);

		if (is_wp_error($terms)) {
			return [];
		}

		return array_map(
			fn($term) => [
				"id" => $term->term_id,
				"label" => $term->name,
			],
			$terms,
		);
	}
}
