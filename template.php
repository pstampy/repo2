<?php

/**
 * @file
 * Template overrides as well as (pre-)process and alter hooks for the
 * NatHERS 2016 theme.
 */
?>

<?php
/**
* hook_form_FORM_ID_alter
*/
function nathers_2016_form_search_block_form_alter(&$form, &$form_state, $form_id) {
    //$form['search_block_form']['#title'] = t('Search'); // Change the text on the label element
    //$form['search_block_form']['#title_display'] = 'invisible'; // Toggle label visibilty
    //$form['search_block_form']['#size'] = 40;  // define size of the textfield
    //$form['search_block_form']['#default_value'] = t('Search'); // Set a default value for the textfield
    $form['actions']['submit']['#value'] = t('GO'); // Change the text on the submit button
    //$form['actions']['submit'] = array('#type' => 'image_button', '#src' => base_path() . path_to_theme() . '/images/search-button.png');

    // Add extra attributes to the text box
    //$form['search_block_form']['#attributes']['onblur'] = "if (this.value == '') {this.value = 'Search';}";
    //$form['search_block_form']['#attributes']['onfocus'] = "if (this.value == 'Search') {this.value = '';}";
    // Prevent user from searching the default text
    $form['#attributes']['onsubmit'] = "if(this.search_block_form.value=='Search'){ alert('Please enter a search'); return false; }";

    // Alternative (HTML5) placeholder attribute instead of using the javascript
    $form['search_block_form']['#attributes']['placeholder'] = t('Search');
} 

function nathers_2016_file_formatter_table($variables) {
    $list = array(
        'items' => array(),
        'title' => '',
        'type' => 'ul',
        'attributes' => array(
            'class' => 'buttons',
        ),
    );
    foreach ($variables['items'] as $delta => $item) {
        $list['items'][] = theme('file_link', array('file' => (object) $item));
    }
    asort($list);
    return empty($list) ? '' : theme('item_list', $list);
}

function nathers_2016_file_link($variables) {
    $file = $variables['file'];
    $icon_directory = drupal_get_path('theme', 'nathers_2016') . '/images';

    $url = file_create_url($file->uri);

    // Human-readable names, for use as text-alternatives to icons.
    $mime_name = array(
        'application/msword' => t('Microsoft Office document icon'),
        'application/vnd.ms-excel' => t('Office spreadsheet icon'),
        'application/vnd.ms-powerpoint' => t('Office presentation icon'),
        'application/pdf' => t('PDF icon'),
        'video/quicktime' => t('Movie icon'),
        'audio/mpeg' => t('Audio icon'),
        'audio/wav' => t('Audio icon'),
        'image/jpeg' => t('Image icon'),
        'image/png' => t('Image icon'),
        'image/gif' => t('Image icon'),
        'application/zip' => t('Package icon'),
        'text/html' => t('HTML icon'),
        'text/plain' => t('Plain text icon'),
        'application/octet-stream' => t('Binary Data'),
    );

    $mimetype = file_get_mimetype($file->uri);

    $icon = theme('file_icon', array(
        'file' => $file,
        'icon_directory' => $icon_directory,
        'alt' => !empty($mime_name[$mimetype]) ? $mime_name[$mimetype] : t('File'),
    ));

    // Set options as per anchor format described at
    // http://microformats.org/wiki/file-format-examples
    $options = array(
        'attributes' => array(
            'type' => $file->filemime . '; length=' . $file->filesize,
        ),
        'html' => true,
    );
    // Get the file extension
    $file->extension = strtoupper(pathinfo($file->filename, PATHINFO_EXTENSION));

    // Use the description as the link text if available.
    if (empty($file->description)) {
        $link_text = $file->filename . $file->extension . ' ' . format_size($file->filesize);
    } else {
        $link_text = $file->description . ' ' . $icon . ' ' . $file->extension . ' ' . format_size($file->filesize);
        $options['attributes']['title'] = check_plain($file->filename);
    }

    return l($link_text, $url, $options);
}
?>