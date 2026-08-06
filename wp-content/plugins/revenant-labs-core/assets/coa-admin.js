/**
 * Media picker for the product COA document field.
 */
( function ( $ ) {
	'use strict';

	$( function () {
		var input = $( '#revenant-labs-coa-attachment' );
		var filename = $( '#revenant-labs-coa-filename' );
		var frame;

		if ( ! input.length ) {
			return;
		}

		$( '#revenant-labs-coa-select' ).on( 'click', function ( event ) {
			event.preventDefault();

			if ( frame ) {
				frame.open();
				return;
			}

			frame = wp.media( {
				title: 'Select the certificate of analysis',
				button: { text: 'Use this document' },
				library: { type: [ 'application/pdf', 'image' ] },
				multiple: false,
			} );

			frame.on( 'select', function () {
				var attachment = frame.state().get( 'selection' ).first().toJSON();

				input.val( attachment.id );
				filename.text( attachment.title || attachment.filename || '' );
			} );

			frame.open();
		} );

		$( '#revenant-labs-coa-clear' ).on( 'click', function ( event ) {
			event.preventDefault();
			input.val( '' );
			filename.text( '' );
		} );
	} );
}( window.jQuery ) );
