/**
 * Editor script for the COA library block.
 *
 * Plain ES5 against the wp.* globals — no build step. The editor shows a
 * labelled placeholder; the real listing is rendered in PHP from published
 * report records only.
 */
( function ( blocks, blockEditor, components, element, i18n ) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var RangeControl = components.RangeControl;
	var ToggleControl = components.ToggleControl;

	blocks.registerBlockType( 'revenant-labs/coa-library', {
		edit: function ( props ) {
			var attributes = props.attributes;
			var blockProps = useBlockProps( { className: 'rl-coa-library rl-coa-library--editor' } );

			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Library settings', 'revenant-labs-core' ) },
						el( RangeControl, {
							label: __( 'Maximum reports shown', 'revenant-labs-core' ),
							value: attributes.limit,
							min: 1,
							max: 200,
							onChange: function ( value ) {
								props.setAttributes( { limit: value } );
							},
							__nextHasNoMarginBottom: true,
						} ),
						el( ToggleControl, {
							label: __( 'Show filters', 'revenant-labs-core' ),
							help: __(
								'Filters are only rendered once at least one report has been published.',
								'revenant-labs-core'
							),
							checked: !! attributes.showFilters,
							onChange: function ( value ) {
								props.setAttributes( { showFilters: value } );
							},
							__nextHasNoMarginBottom: true,
						} )
					)
				),
				el(
					'div',
					blockProps,
					el(
						'p',
						{ className: 'rl-coa__badge' },
						__( 'COA library', 'revenant-labs-core' )
					),
					el(
						'p',
						{ className: 'rl-coa__editor-hint' },
						__(
							'Lists certificates of analysis that have been published against a product lot. Until a report is published, the front end shows a plain empty state instead of this block.',
							'revenant-labs-core'
						)
					)
				)
			);
		},
		save: function () {
			// Rendered in PHP so absent data is never printed.
			return null;
		},
	} );
}( window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n ) );
