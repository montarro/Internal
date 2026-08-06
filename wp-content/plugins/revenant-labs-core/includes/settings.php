<?php
/**
 * Settings screen.
 *
 * One setting: the wording of the checkout research-use declaration, so it can
 * be adjusted without touching code.
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register the settings page.
 *
 * @return void
 */
function revenant_labs_core_settings_page(): void {
	add_options_page(
		__( 'Revenant Labs', 'revenant-labs-core' ),
		__( 'Revenant Labs', 'revenant-labs-core' ),
		'manage_options',
		'revenant-labs-core',
		'revenant_labs_core_render_settings'
	);
}
add_action( 'admin_menu', 'revenant_labs_core_settings_page' );

/**
 * Register the settings themselves.
 *
 * @return void
 */
function revenant_labs_core_register_settings(): void {
	register_setting(
		'revenant_labs_core',
		REVENANT_LABS_DECLARATION_OPTION,
		array(
			'type'              => 'string',
			'sanitize_callback' => 'revenant_labs_core_sanitize_declaration',
			'default'           => '',
			'show_in_rest'      => false,
		)
	);

	add_settings_section(
		'revenant_labs_core_checkout',
		__( 'Checkout declaration', 'revenant-labs-core' ),
		'revenant_labs_core_section_intro',
		'revenant-labs-core'
	);

	add_settings_field(
		REVENANT_LABS_DECLARATION_OPTION,
		__( 'Declaration wording', 'revenant-labs-core' ),
		'revenant_labs_core_declaration_field',
		'revenant-labs-core',
		'revenant_labs_core_checkout',
		array( 'label_for' => REVENANT_LABS_DECLARATION_OPTION )
	);
}
add_action( 'admin_init', 'revenant_labs_core_register_settings' );

/**
 * Sanitise the declaration wording.
 *
 * Plain text only — no markup is accepted into a compliance statement.
 *
 * @param mixed $value Submitted value.
 * @return string
 */
function revenant_labs_core_sanitize_declaration( $value ): string {
	if ( ! is_string( $value ) ) {
		return '';
	}

	return sanitize_textarea_field( $value );
}

/**
 * Section introduction.
 *
 * @return void
 */
function revenant_labs_core_section_intro(): void {
	echo '<p>' . esc_html__( 'This checkbox is required on every order, is never pre-checked, and is validated on the server. Leave the field empty to use the default wording.', 'revenant-labs-core' ) . '</p>';
}

/**
 * Render the declaration textarea.
 *
 * @return void
 */
function revenant_labs_core_declaration_field(): void {
	$value = (string) get_option( REVENANT_LABS_DECLARATION_OPTION, '' );

	printf(
		'<textarea id="%1$s" name="%1$s" rows="3" class="large-text">%2$s</textarea>',
		esc_attr( REVENANT_LABS_DECLARATION_OPTION ),
		esc_textarea( $value )
	);

	echo '<p class="description">' . esc_html__( 'Currently shown at checkout:', 'revenant-labs-core' ) . ' <em>' . esc_html( revenant_labs_core_declaration_label() ) . '</em></p>';
}

/**
 * Render the settings page.
 *
 * @return void
 */
function revenant_labs_core_render_settings(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	?>
	<div class="wrap">
		<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
		<form action="options.php" method="post">
			<?php
			settings_fields( 'revenant_labs_core' );
			do_settings_sections( 'revenant-labs-core' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}
