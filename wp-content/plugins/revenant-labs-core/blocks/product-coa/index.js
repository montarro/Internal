/**
 * Editor script for the COA details block.
 *
 * Written in plain ES5 against the wp.* globals so the plugin needs no build
 * step. The editor shows a clearly marked placeholder rather than live data:
 * a product's real COA record is rendered on the front end only, and only when
 * a report has actually been published.
 */
( function ( blocks, blockEditor, components, element, i18n ) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;

	var DISPLAY_OPTIONS = [
		{
			label: __( 'Badge — "COA available" only', 'revenant-labs-core' ),
			value: 'badge',
		},
		{
			label: __( 'Summary — badge, lot and a View COA link', 'revenant-labs-core' ),
			value: 'summary',
		},
		{
			label: __( 'Table — all recorded fields and a View COA link', 'revenant-labs-core' ),
			value: 'table',
		},
	];

	var HINTS = {
		badge: __( 'Front end: a "COA available" badge.', 'revenant-labs-core' ),
		summary: __( 'Front end: badge, lot number and a View COA link.', 'revenant-labs-core' ),
		table: __( 'Front end: every recorded field, then a View COA link.', 'revenant-labs-core' ),
	};

	blocks.registerBlockType( 'revenant-labs/product-coa', {
		edit: function ( props ) {
			var display = props.attributes.display || 'summary';
			var blockProps = useBlockProps( { className: 'rl-coa rl-coa--editor' } );

			return el(
				element.Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'COA display', 'revenant-labs-core' ) },
						el( SelectControl, {
							label: __( 'Display as', 'revenant-labs-core' ),
							value: display,
							options: DISPLAY_OPTIONS,
							onChange: function ( value ) {
								props.setAttributes( { display: value } );
							},
							__nextHasNoMarginBottom: true,
						} )
					)
				),
				el(
					'div',
					blockProps,
					el(
						'span',
						{ className: 'rl-coa__badge' },
						__( 'COA details', 'revenant-labs-core' )
					),
					el(
						'span',
						{ className: 'rl-coa__editor-hint' },
						HINTS[ display ] +
							' ' +
							__(
								'Nothing is output for a product with no published report.',
								'revenant-labs-core'
							)
					)
				)
			);
		},
		save: function () {
			// Rendered in PHP so the front end can omit absent fields.
			return null;
		},
	} );
}( window.wp.blocks, window.wp.blockEditor, window.wp.components, window.wp.element, window.wp.i18n ) );
