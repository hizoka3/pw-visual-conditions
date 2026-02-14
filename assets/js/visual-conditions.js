// assets/js/visual-conditions.js

(function ($) {
	"use strict";

	/**
	 * PW Visual Conditions
	 * Handles the multi-row include/exclude condition selector UI.
	 */
	class VisualConditions {
		constructor(wrapper) {
			this.$wrapper = $(wrapper);
			this.$rows = this.$wrapper.find(".pw-vc-rows");
			this.$input = this.$wrapper.find(".pw-vc-input");
			this.nonce = this.$wrapper.data("nonce");
			this.ajaxUrl = this.$wrapper.data("ajax-url");
			this.conditions = this.$wrapper.data("conditions") || [];
			this.sources = null;

			this.init();
		}

		async init() {
			this.sources = await this.fetchSources();
			this.renderExisting();
			this.bindEvents();
		}

		// -----------------------------------------------------------------------
		// Rendering
		// -----------------------------------------------------------------------

		renderExisting() {
			if (!this.conditions.length) {
				this.addRow();
				return;
			}
			this.conditions.forEach((condition) => this.addRow(condition));
		}

		addRow(condition = {}) {
			const row = this.buildRow(condition);
			this.$rows.append(row);

			const $row = this.$rows.find(".pw-vc-row:last-child");
			this.populateSources($row);

			if (condition.source) {
				$row.find(".pw-vc-source").val(condition.source).trigger("change");
			}
		}

		buildRow(condition = {}) {
			const operator = condition.operator || "include";

			return `
                <div class="pw-vc-row">
                    <select class="pw-vc-operator">
                        <option value="include" ${operator === "include" ? "selected" : ""}>
                            Include
                        </option>
                        <option value="exclude" ${operator === "exclude" ? "selected" : ""}>
                            Exclude
                        </option>
                    </select>

                    <select class="pw-vc-source">
                        <option value="">— Select —</option>
                    </select>

                    <select class="pw-vc-items" multiple style="display:none;">
                    </select>

                    <input type="text" class="pw-vc-search" placeholder="Search..." style="display:none;">

                    <button type="button" class="pw-vc-remove">✕</button>
                </div>
            `;
		}

		populateSources($row) {
			const $source = $row.find(".pw-vc-source");

			Object.entries(this.sources).forEach(([groupKey, group]) => {
				const $group = $(`<optgroup label="${group.label}">`);

				group.children.forEach((child) => {
					$group.append(`<option value="${child.key}">${child.label}</option>`);
				});

				$source.append($group);
			});
		}

		async populateItems($row, sourceKey) {
			const $items = $row.find(".pw-vc-items");
			const $search = $row.find(".pw-vc-search");

			// Find source config
			const sourceConfig = this.findSourceConfig(sourceKey);

			if (!sourceConfig || !sourceConfig.searchable) {
				$items.hide().empty();
				$search.hide();
				return;
			}

			$search.show();
			$items.show().empty().append("<option>Loading...</option>");

			const results = await this.fetchItems(sourceConfig.source, $search.val());

			$items.empty();
			results.forEach((item) => {
				$items.append(`<option value="${item.id}">${item.label}</option>`);
			});
		}

		// -----------------------------------------------------------------------
		// Events
		// -----------------------------------------------------------------------

		bindEvents() {
			// Add condition row
			this.$wrapper.find(".pw-vc-add-condition").on("click", () => {
				this.addRow();
			});

			// Source change → load items
			this.$rows.on("change", ".pw-vc-source", async (e) => {
				const $row = $(e.target).closest(".pw-vc-row");
				await this.populateItems($row, e.target.value);
				this.syncInput();
			});

			// Search items
			this.$rows.on(
				"input",
				".pw-vc-search",
				this.debounce(async (e) => {
					const $row = $(e.target).closest(".pw-vc-row");
					const sourceKey = $row.find(".pw-vc-source").val();
					const sourceConf = this.findSourceConfig(sourceKey);
					if (!sourceConf) return;

					const results = await this.fetchItems(
						sourceConf.source,
						e.target.value,
					);
					const $items = $row.find(".pw-vc-items").empty();
					results.forEach((item) => {
						$items.append(`<option value="${item.id}">${item.label}</option>`);
					});
				}, 300),
			);

			// Remove row
			this.$rows.on("click", ".pw-vc-remove", (e) => {
				$(e.target).closest(".pw-vc-row").remove();
				this.syncInput();
			});

			// Any change → sync hidden input
			this.$rows.on("change", "select, input", () => this.syncInput());
		}

		// -----------------------------------------------------------------------
		// Data sync
		// -----------------------------------------------------------------------

		syncInput() {
			const conditions = [];

			this.$rows.find(".pw-vc-row").each((_, row) => {
				const $row = $(row);
				const source = $row.find(".pw-vc-source").val();
				if (!source) return;

				const selectedItems = $row.find(".pw-vc-items").val() || [];

				conditions.push({
					operator: $row.find(".pw-vc-operator").val(),
					source,
					items: selectedItems,
				});
			});

			this.$input.val(JSON.stringify(conditions));
		}

		// -----------------------------------------------------------------------
		// AJAX
		// -----------------------------------------------------------------------

		async fetchSources() {
			const response = await $.post(this.ajaxUrl, {
				action: "pw_vc_get_sources",
				nonce: this.nonce,
			});
			return response.success ? response.data : {};
		}

		async fetchItems(source, search = "") {
			const response = await $.post(this.ajaxUrl, {
				action: "pw_vc_get_items",
				nonce: this.nonce,
				source,
				search,
			});
			return response.success ? response.data : [];
		}

		// -----------------------------------------------------------------------
		// Helpers
		// -----------------------------------------------------------------------

		findSourceConfig(sourceKey) {
			for (const group of Object.values(this.sources)) {
				const found = group.children.find((c) => c.key === sourceKey);
				if (found) return found;
			}
			return null;
		}

		debounce(fn, delay) {
			let timer;
			return (...args) => {
				clearTimeout(timer);
				timer = setTimeout(() => fn.apply(this, args), delay);
			};
		}
	}

	// Init all instances on the page
	$(document).ready(() => {
		$(".pw-vc-wrapper").each((_, wrapper) => {
			new VisualConditions(wrapper);
		});
	});
})(jQuery);
