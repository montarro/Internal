<?php
/**
 * Block style variations.
 *
 * These give editors named, on-brand options in the block sidebar instead of
 * asking them to remember utility class names.
 *
 * @package RevenantLabs
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register block styles.
 *
 * @return void
 */
function revenant_labs_register_block_styles(): void {
	register_block_style(
		'core/group',
		array(
			'name'         => 'rl-card',
			'label'        => __( 'Bordered card', 'revenant-labs' ),
			'inline_style' => '
				.wp-block-group.is-style-rl-card {
					background-color: var(--wp--preset--color--white);
					border: 1px solid var(--wp--preset--color--warm-border);
					border-radius: var(--wp--custom--radius--card);
					padding: var(--wp--preset--spacing--50);
					transition: border-color var(--wp--custom--transition--base), box-shadow var(--wp--custom--transition--base);
				}
				.wp-block-group.is-style-rl-card:hover {
					border-color: var(--wp--preset--color--violet);
					box-shadow: var(--wp--preset--shadow--subtle);
				}',
		)
	);

	register_block_style(
		'core/group',
		array(
			'name'         => 'rl-panel-dark',
			'label'        => __( 'Dark panel', 'revenant-labs' ),
			'inline_style' => '
				.wp-block-group.is-style-rl-panel-dark {
					background-color: var(--wp--preset--color--dark-panel);
					background-image: var(--wp--preset--gradient--violet-glow);
					border-radius: var(--wp--custom--radius--panel);
					color: var(--wp--preset--color--white);
					padding: var(--wp--preset--spacing--70);
				}
				.wp-block-group.is-style-rl-panel-dark :where(h1, h2, h3, h4, h5, h6) {
					color: var(--wp--preset--color--white);
				}',
		)
	);

	register_block_style(
		'core/button',
		array(
			'name'         => 'rl-secondary',
			'label'        => __( 'Secondary', 'revenant-labs' ),
			'inline_style' => '
				.wp-block-button.is-style-rl-secondary .wp-block-button__link {
					background-color: transparent;
					border-color: var(--wp--preset--color--near-black);
					color: var(--wp--preset--color--near-black);
				}
				.wp-block-button.is-style-rl-secondary .wp-block-button__link:hover,
				.wp-block-button.is-style-rl-secondary .wp-block-button__link:focus-visible {
					background-color: var(--wp--preset--color--violet-soft);
					border-color: var(--wp--preset--color--violet);
					color: var(--wp--preset--color--violet-dark);
				}
				.wp-block-group.is-style-rl-panel-dark .wp-block-button.is-style-rl-secondary .wp-block-button__link {
					border-color: rgba(255, 255, 255, 0.35);
					color: var(--wp--preset--color--white);
				}
				.wp-block-group.is-style-rl-panel-dark .wp-block-button.is-style-rl-secondary .wp-block-button__link:hover,
				.wp-block-group.is-style-rl-panel-dark .wp-block-button.is-style-rl-secondary .wp-block-button__link:focus-visible {
					background-color: rgba(255, 255, 255, 0.08);
					border-color: var(--wp--preset--color--violet);
					color: var(--wp--preset--color--white);
				}',
		)
	);

	register_block_style(
		'core/heading',
		array(
			'name'         => 'rl-eyebrow',
			'label'        => __( 'Eyebrow (technical)', 'revenant-labs' ),
			'inline_style' => '
				:where(h1, h2, h3, h4, h5, h6).is-style-rl-eyebrow {
					color: var(--wp--preset--color--muted-text);
					font-family: var(--wp--preset--font-family--mono);
					font-size: var(--wp--preset--font-size--x-small);
					font-weight: 500;
					letter-spacing: 0.14em;
					line-height: 1.4;
					text-transform: uppercase;
				}',
		)
	);

	register_block_style(
		'core/paragraph',
		array(
			'name'         => 'rl-meta',
			'label'        => __( 'Technical metadata', 'revenant-labs' ),
			'inline_style' => '
				p.is-style-rl-meta {
					font-family: var(--wp--preset--font-family--mono);
					font-size: var(--wp--preset--font-size--x-small);
					letter-spacing: 0.06em;
					line-height: 1.6;
					text-transform: uppercase;
				}',
		)
	);

	register_block_style(
		'core/separator',
		array(
			'name'         => 'rl-warm',
			'label'        => __( 'Warm divider', 'revenant-labs' ),
			'inline_style' => '
				.wp-block-separator.is-style-rl-warm {
					background: none;
					border-top: 1px solid var(--wp--preset--color--warm-border);
					border-bottom: 0;
					opacity: 1;
				}',
		)
	);

	register_block_style(
		'core/image',
		array(
			'name'         => 'rl-panel-image',
			'label'        => __( 'Panel image', 'revenant-labs' ),
			'inline_style' => '
				.wp-block-image.is-style-rl-panel-image img {
					border-radius: var(--wp--custom--radius--panel);
				}',
		)
	);
}
add_action( 'init', 'revenant_labs_register_block_styles' );
