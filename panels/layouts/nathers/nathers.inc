<?php

/**
 * @file
 * Defines a naked two-column layout.
 */

// Plugin definition.
$plugin = array(
  'title' => t('NatHERS Layout'),
  'category' => t('NatHERS'),
  'icon' => 'nathers.png',
  'theme' => 'nathers',
  'regions' => array(
    'left' => t('Left'),
    'right' => t('Right'),
  ),
);
