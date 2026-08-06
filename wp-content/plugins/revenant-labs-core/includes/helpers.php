<?php
/**
 * Shared helpers for reading certificate-of-analysis data.
 *
 * Every reader here returns only values that actually exist. Nothing is
 * defaulted, inferred or filled in — an absent field stays absent so the front
 * end can omit it rather than print an empty label.
 *
 * @package RevenantLabsCore
 */

declare( strict_types = 1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Meta keys used for COA data, keyed by short field name.
 *
 * @return array<string, string>
 */
function revenant_labs_core_meta_keys(): array {
	return array(
		'attachment_id' => '_revenant_labs_coa_attachment_id',
		'document_url'  => '_revenant_labs_coa_document_url',
		'batch_number'  => '_revenant_labs_batch_number',
		'lot_number'    => '_revenant_labs_lot_number',
		'testing_lab'   => '_revenant_labs_testing_lab',
		'test_date'     => '_revenant_labs_test_date',
		'purity_result' => '_revenant_labs_purity_result',
		'report_status' => '_revenant_labs_report_status',
	);
}

/**
 * Human-readable labels for each COA field.
 *
 * @return array<string, string>
 */
function revenant_labs_core_field_labels(): array {
	return array(
		'lot_number'    => __( 'Lot number', 'revenant-labs-core' ),
		'batch_number'  => __( 'Batch number', 'revenant-labs-core' ),
		'testing_lab'   => __( 'Testing laboratory', 'revenant-labs-core' ),
		'test_date'     => __( 'Test date', 'revenant-labs-core' ),
		'purity_result' => __( 'Result as reported', 'revenant-labs-core' ),
	);
}

/**
 * Allowed report statuses.
 *
 * An empty status is the default and means "not recorded". Only `published`
 * makes a report public.
 *
 * @return array<string, string>
 */
function revenant_labs_core_report_statuses(): array {
	return array(
		''              => __( '— Not recorded —', 'revenant-labs-core' ),
		'published'     => __( 'Published — show this report publicly', 'revenant-labs-core' ),
		'on_file'       => __( 'On file — held but not published', 'revenant-labs-core' ),
		'not_available' => __( 'Not available for this lot', 'revenant-labs-core' ),
	);
}

/**
 * Read the stored COA record for a product.
 *
 * @param int $product_id Product post ID.
 * @return array<string, string|int> Only the fields that hold a real value.
 */
function revenant_labs_core_get_record( int $product_id ): array {
	$record = array();

	foreach ( revenant_labs_core_meta_keys() as $field => $meta_key ) {
		$value = get_post_meta( $product_id, $meta_key, true );

		if ( 'attachment_id' === $field ) {
			$value = (int) $value;

			if ( $value > 0 ) {
				$record[ $field ] = $value;
			}

			continue;
		}

		if ( is_string( $value ) && '' !== trim( $value ) ) {
			$record[ $field ] = trim( $value );
		}
	}

	return $record;
}

/**
 * Resolve the public URL of the COA document, if one has been attached.
 *
 * Attachments in the media library take precedence over a manually entered
 * URL.
 *
 * @param array<string, string|int> $record COA record.
 * @return string Empty string when no document exists.
 */
function revenant_labs_core_document_url( array $record ): string {
	if ( ! empty( $record['attachment_id'] ) ) {
		$url = wp_get_attachment_url( (int) $record['attachment_id'] );

		if ( $url ) {
			return $url;
		}
	}

	if ( ! empty( $record['document_url'] ) ) {
		return (string) $record['document_url'];
	}

	return '';
}

/**
 * Whether a product has a report that may be shown publicly.
 *
 * Requires both an explicit `published` status and an actual document. A
 * half-filled record is never treated as a published report.
 *
 * @param array<string, string|int> $record COA record.
 * @return bool
 */
function revenant_labs_core_is_published( array $record ): bool {
	if ( empty( $record['report_status'] ) || 'published' !== $record['report_status'] ) {
		return false;
	}

	return '' !== revenant_labs_core_document_url( $record );
}

/**
 * Format a stored test date for display, using the site's date format.
 *
 * Returns the raw stored value if it cannot be parsed, rather than inventing a
 * date or silently dropping it.
 *
 * @param string $stored Stored date in Y-m-d form.
 * @return string
 */
function revenant_labs_core_format_date( string $stored ): string {
	$timestamp = strtotime( $stored );

	if ( false === $timestamp ) {
		return $stored;
	}

	return wp_date( (string) get_option( 'date_format', 'j F Y' ), $timestamp );
}

/**
 * Validate a Y-m-d date string.
 *
 * @param string $value Candidate date.
 * @return bool
 */
function revenant_labs_core_is_valid_date( string $value ): bool {
	$parts = explode( '-', $value );

	if ( 3 !== count( $parts ) ) {
		return false;
	}

	list( $year, $month, $day ) = array_map( 'absint', $parts );

	return checkdate( $month, $day, $year );
}

/**
 * The display-ready metadata rows for a record, skipping absent fields.
 *
 * @param array<string, string|int> $record COA record.
 * @return array<int, array{label: string, value: string}>
 */
function revenant_labs_core_metadata_rows( array $record ): array {
	$rows   = array();
	$labels = revenant_labs_core_field_labels();

	foreach ( $labels as $field => $label ) {
		if ( empty( $record[ $field ] ) ) {
			continue;
		}

		$value = (string) $record[ $field ];

		if ( 'test_date' === $field ) {
			$value = revenant_labs_core_format_date( $value );
		}

		$rows[] = array(
			'label' => $label,
			'value' => $value,
		);
	}

	return $rows;
}
