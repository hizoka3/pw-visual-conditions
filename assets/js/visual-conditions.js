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

				// Pre-populate Select2 with saved item after Select2 is initialized
				if (condition.items?.length) {
					const savedId = condition.items[0];
					const sourceConfig = this.findSourceConfig(condition.source);
					if (sourceConfig?.source) {
						this.fetchItems(sourceConfig.source, "").then((results) => {
							const found = results.find(
								(r) => String(r.id) === String(savedId),
							);
							if (!found) return;
							const $items = $row.find(".pw-vc-items");
							const option = new Option(found.label, found.id, true, true);
							$items.append(option).trigger("change");
						});
					}
				}
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

                    <select class="pw-vc-items" style="display:none;">
                    </select>

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
			const sourceConfig = this.findSourceConfig(sourceKey);

			// Destroy previous Select2 instance if exists
			if ($items.data("select2")) {
				$items.select2("destroy");
			}

			if (!sourceConfig || !sourceConfig.searchable) {
				$items.hide().empty();
				return;
			}

			$items.show().empty();

			$items.select2({
				placeholder: "Search...",
				allowClear: true,
				minimumInputLength: 0,
				ajax: {
					transport: (params, success, failure) => {
						this.fetchItems(sourceConfig.source, params.data.term || "")
							.then((results) =>
								success({
									results: results.map((item) => ({
										id: item.id,
										text: item.label,
									})),
								}),
							)
							.catch(failure);
					},
					delay: 300,
				},
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

			// Remove row
			this.$rows.on("click", ".pw-vc-remove", (e) => {
				const $row = $(e.target).closest(".pw-vc-row");
				const $items = $row.find(".pw-vc-items");
				if ($items.data("select2")) {
					$items.select2("destroy");
				}
				$row.remove();
				this.syncInput();
			});

			// Any change → sync hidden input
			this.$rows.on("change", "select", () => this.syncInput());
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

				const rawValue = $row.find(".pw-vc-items").val();
				const selectedItems = rawValue
					? Array.isArray(rawValue)
						? rawValue
						: [rawValue]
					: [];

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
	}

	// Init all instances on the page
	$(document).ready(() => {
		$(".pw-vc-wrapper").each((_, wrapper) => {
			new VisualConditions(wrapper);
		});
	});
})(jQuery);
