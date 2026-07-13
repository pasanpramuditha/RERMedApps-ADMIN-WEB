<?php

if ($tag === 'GET_TAX_WORKSPACE') {
    handle_get_tax_workspace($main_mysqli);
}

if ($tag === 'SAVE_TAX_LEDGER_ENTRY') {
    handle_save_tax_ledger_entry($main_mysqli);
}

if ($tag === 'DELETE_TAX_LEDGER_ENTRY') {
    handle_delete_tax_ledger_entry($main_mysqli);
}

if ($tag === 'SAVE_TAX_CATEGORY') {
    handle_save_tax_category($main_mysqli);
}

if ($tag === 'DELETE_TAX_CATEGORY') {
    handle_delete_tax_category($main_mysqli);
}

if ($tag === 'SAVE_TAX_SUBCATEGORY') {
    handle_save_tax_subcategory($main_mysqli);
}

if ($tag === 'DELETE_TAX_SUBCATEGORY') {
    handle_delete_tax_subcategory($main_mysqli);
}

if ($tag === 'SIMULATE_TAX_EMAIL') {
    handle_simulate_tax_email($main_mysqli);
}

if ($tag === 'APPROVE_TAX_EMAIL') {
    handle_approve_tax_email($main_mysqli);
}

if ($tag === 'APPROVE_TAX_EMAIL_GROUP') {
    handle_approve_tax_email_group($main_mysqli);
}

if ($tag === 'UPDATE_TAX_EMAIL') {
    handle_update_tax_email($main_mysqli);
}

if ($tag === 'GET_TAX_EMAIL_ATTACHMENT') {
    handle_get_tax_email_attachment($main_mysqli);
}

if ($tag === 'DELETE_TAX_EMAIL') {
    handle_delete_tax_email($main_mysqli);
}

if ($tag === 'MARK_TAX_EMAIL_DUPLICATE') {
    handle_mark_tax_email_duplicate($main_mysqli);
}

if ($tag === 'SAVE_TAX_GMAIL_SETTINGS') {
    handle_save_tax_gmail_settings($main_mysqli);
}

if ($tag === 'SYNC_TAX_GMAIL_EMAILS') {
    handle_sync_tax_gmail_emails($main_mysqli);
}

if ($tag === 'SYNC_TAX_IMAP_EMAILS') {
    handle_sync_tax_imap_emails($main_mysqli);
}

function handle_get_tax_workspace($mysqli)
{
    $tax_year = trim((string) ($_POST['tax_year'] ?? '2025/2026'));
    seed_tax_defaults($mysqli);
    ensure_tax_ledger_attachment_name_column($mysqli);

    send_json([
        'success' => true,
        'ledger' => get_tax_ledger_rows($mysqli, $tax_year),
        'categories' => get_tax_category_rows($mysqli),
        'email_queue' => get_tax_email_rows($mysqli),
    ]);
}

function handle_save_tax_gmail_settings($mysqli)
{
    $settings = GetGlobalSettings($mysqli);
    $settings['tax_gmail_client_id'] = trim((string) ($_POST['client_id'] ?? ''));
    $settings['tax_gmail_client_secret'] = trim((string) ($_POST['client_secret'] ?? ''));
    $settings['tax_gmail_refresh_token'] = trim((string) ($_POST['refresh_token'] ?? ''));
    $settings['tax_gmail_mailbox'] = trim((string) ($_POST['mailbox'] ?? 'rermedapps.tax@gmail.com'));
    $settings['tax_gmail_income_label'] = trim((string) ($_POST['income_label'] ?? 'Income'));
    $settings['tax_gmail_expense_label'] = trim((string) ($_POST['expense_label'] ?? 'Expenses'));
    $settings['tax_gmail_approved_label'] = trim((string) ($_POST['approved_label'] ?? 'Tax/Approved'));
    $settings['tax_gmail_duplicate_label'] = trim((string) ($_POST['duplicate_label'] ?? ($settings['tax_gmail_duplicate_label'] ?? 'Tax/Duplicate')));
    $settings['tax_gmail_deleted_label'] = trim((string) ($_POST['deleted_label'] ?? ($settings['tax_gmail_deleted_label'] ?? 'Tax/Deleted')));

    if ($settings['tax_gmail_client_id'] === '' || $settings['tax_gmail_client_secret'] === '' || $settings['tax_gmail_refresh_token'] === '') {
        send_json(['success' => false, 'error_msg' => 'Gmail client id, client secret, and refresh token are required'], 400);
    }

    $result = SaveGlobalSettings($mysqli, $settings);
    if (!$result['success']) {
        send_json(['success' => false, 'error_msg' => $result['error_msg'] ?? 'Failed to save Gmail settings'], 500);
    }

    send_json(['success' => true]);
}

function handle_sync_tax_gmail_emails($mysqli)
{
    handle_sync_tax_imap_emails($mysqli);
}

function handle_sync_tax_imap_emails($mysqli)
{
    if (!function_exists('imap_open')) {
        send_json(['success' => false, 'error_msg' => 'PHP IMAP extension is not enabled on this server.'], 500);
    }

    seed_tax_defaults($mysqli);
    $settings = GetGlobalSettings($mysqli);

    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $mailbox = trim((string) ($settings['tax_imap_mailbox'] ?? getenv('TAX_IMAP_MAILBOX') ?: 'INBOX'));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    $limit = max(1, min(500, (int) ($_POST['limit'] ?? 100)));

    if ($host === '' || $mailbox === '' || $username === '' || $password === '') {
        send_json(['success' => false, 'error_msg' => 'Tax IMAP host, mailbox, username, and password are required in Settings.'], 400);
    }

    $reset = reset_tax_email_sync_cache($mysqli);
    $mailbox = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $mailbox);
    $mailbox_path = tax_imap_mailbox_path($host, $port, $encryption, $mailbox);
    $queued = 0;
    $skipped = 0;
    $errors = [];
    $searched = [$mailbox_path . ' ALL'];
    $found = 0;

    $inbox = @imap_open($mailbox_path, $username, $password);
    if (!$inbox) {
        send_json(['success' => false, 'error_msg' => 'IMAP connection failed: ' . (imap_last_error() ?: 'unknown error')], 400);
    }

    $uidvalidity = tax_imap_uidvalidity($inbox, $mailbox_path);
    $emails = tax_imap_message_numbers($inbox);
    if (count($emails) > 0) {
        foreach (array_slice($emails, 0, $limit) as $message_no) {
            $uid = imap_uid($inbox, (int) $message_no);
            $message_id = 'imap:' . $mailbox . ':' . $uidvalidity . ':' . $uid;
            if ($uid <= 0 || tax_email_message_is_processed($mysqli, $message_id)) {
                $skipped++;
                continue;
            }

            $found++;
            $message = tax_parse_imap_message($mysqli, $inbox, (int) $message_no, $message_id, $mailbox);
            if (!empty($message['error_message'])) {
                $errors[] = $message['error_message'];
                continue;
            }

            $rows = $message['rows'] ?? [];
            foreach ($rows as $row) {
                if (tax_ledger_email_subject_exists($mysqli, (string) ($row['subject'] ?? ''), (string) ($row['suggested_type'] ?? 'Expense'))) {
                    $skipped++;
                    continue;
                }

                $result = insert_tax_email_queue_from_gmail($mysqli, $row);
                if ($result === 'inserted') {
                    $queued++;
                    continue;
                }
                if ($result === 'duplicate') {
                    $skipped++;
                    continue;
                }
                $errors[] = 'Failed to queue IMAP message ' . $message_id;
            }
        }
    }
    imap_close($inbox);
    refresh_tax_email_message_child_counts($mysqli);

    send_json([
        'success' => true,
        'inserted' => $queued,
        'skipped' => $skipped,
        'found' => $found,
        'reset' => $reset,
        'searched' => $searched,
        'errors' => $errors,
        'email_queue' => get_tax_email_rows($mysqli),
    ]);
}

function reset_tax_email_sync_cache($mysqli)
{
    $queue_count = 0;
    $message_count = 0;
    $mode = 'delete';
    $errors = [];

    $count = $mysqli->query('SELECT COUNT(*) AS total FROM fnd_tax_email_queue_tab');
    if ($count) {
        $row = $count->fetch_assoc();
        $queue_count = (int) ($row['total'] ?? 0);
        $count->free();
    }
    $count = $mysqli->query('SELECT COUNT(*) AS total FROM fnd_tax_email_messages_tab');
    if ($count) {
        $row = $count->fetch_assoc();
        $message_count = (int) ($row['total'] ?? 0);
        $count->free();
    }

    if (!$mysqli->query('DELETE FROM fnd_tax_email_queue_tab')) {
        $mode = 'stale-update';
        $errors[] = 'queue delete failed: ' . $mysqli->error;
        $mysqli->query(
            'UPDATE fnd_tax_email_queue_tab
             SET valid = 0,
                 status = "Rejected",
                 gmail_message_id = CONCAT(LEFT(COALESCE(gmail_message_id, ""), 120), ":stale:", id),
                 gmail_attachment_id = CONCAT(LEFT(COALESCE(gmail_attachment_id, ""), 120), ":stale:", id),
                 gmail_part_id = CONCAT(LEFT(COALESCE(gmail_part_id, ""), 40), ":stale:", id),
                 updated_at = CURRENT_TIMESTAMP'
        );
    }

    if (!$mysqli->query('DELETE FROM fnd_tax_email_messages_tab')) {
        $mode = 'stale-update';
        $errors[] = 'message delete failed: ' . $mysqli->error;
        $mysqli->query(
            'UPDATE fnd_tax_email_messages_tab
             SET valid = 0,
                 read_status = "Processed",
                 gmail_message_id = CONCAT(LEFT(COALESCE(gmail_message_id, ""), 120), ":stale:", id),
                 updated_at = CURRENT_TIMESTAMP'
        );
    }

    return [
        'mode' => $mode,
        'queueCleared' => $queue_count,
        'messagesCleared' => $message_count,
        'errors' => $errors,
    ];
}

function tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $target_mailbox)
{
    $target_mailbox = trim((string) $target_mailbox);
    if ($target_mailbox === '') {
        return 'INBOX';
    }

    $server = tax_imap_server_prefix($host, $port, $encryption);
    $probe = @imap_open($server . 'INBOX', $username, $password);
    if (!$probe) {
        return $target_mailbox;
    }

    $mailboxes = @imap_list($probe, $server, '*');
    imap_close($probe);
    if (!is_array($mailboxes)) {
        return $target_mailbox;
    }

    $normalized_target = strtolower(trim($target_mailbox, " \t\n\r\0\x0B./"));
    foreach ($mailboxes as $mailbox_path) {
        $name = preg_replace('/^\{[^}]+\}/', '', (string) $mailbox_path);
        $normalized_name = strtolower(trim($name, " \t\n\r\0\x0B./"));
        $leaf = strtolower(trim((string) preg_replace('/^.*[\/.]/', '', $name), " \t\n\r\0\x0B./"));
        if ($normalized_name === $normalized_target || $leaf === $normalized_target) {
            return $name;
        }
    }

    return $target_mailbox;
}

function tax_imap_message_numbers($inbox)
{
    $emails = imap_search($inbox, 'ALL');
    if (is_array($emails) && count($emails) > 0) {
        rsort($emails);
        return array_values(array_map('intval', $emails));
    }

    $count = imap_num_msg($inbox);
    if ($count <= 0) {
        return [];
    }

    return range($count, 1);
}

function tax_imap_uidvalidity($inbox, $mailbox_path)
{
    $status = @imap_status($inbox, $mailbox_path, SA_UIDVALIDITY);
    $value = (int) ($status->uidvalidity ?? 0);
    return $value > 0 ? $value : 0;
}

function tax_imap_server_prefix($host, $port, $encryption)
{
    $encryption = strtolower((string) $encryption);
    $flags = '/imap';
    if ($encryption === 'ssl') {
        $flags .= '/ssl';
    } elseif ($encryption === 'tls') {
        $flags .= '/tls';
    } else {
        $flags .= '/notls';
    }
    return '{' . $host . ':' . max(1, (int) $port) . $flags . '}';
}

function tax_imap_mailbox_path($host, $port, $encryption, $mailbox)
{
    return tax_imap_server_prefix($host, $port, $encryption) . ($mailbox ?: 'INBOX');
}

function tax_parse_imap_message($mysqli, $inbox, $message_no, $message_id, $mailbox)
{
    $overview_list = imap_fetch_overview($inbox, (string) $message_no, 0);
    $overview = is_array($overview_list) && isset($overview_list[0]) ? $overview_list[0] : null;
    $structure = imap_fetchstructure($inbox, $message_no);
    if (!$overview || !$structure) {
        return ['error_message' => 'Failed to read IMAP message ' . $message_id];
    }

    $subject = substr(tax_imap_decode_header((string) ($overview->subject ?? '(No subject)')), 0, 255);
    $from = substr(tax_imap_decode_header((string) ($overview->from ?? 'unknown')), 0, 190);
    $received_at = isset($overview->udate) ? date('Y-m-d H:i:s', (int) $overview->udate) : date('Y-m-d H:i:s');
    $body = trim(tax_imap_fetch_body_text($inbox, $message_no, $structure));
    $attachments = tax_imap_collect_attachments($structure);
    $attachment_names = implode("\n", array_map(function ($attachment) {
        return (string) ($attachment['filename'] ?? '');
    }, $attachments));
    $text = trim($subject . "\n" . $body . "\n" . $attachment_names);
    $type = tax_imap_infer_type($text);
    $currency = tax_extract_currency($text);
    $amount = tax_extract_amount($text);
    $category = 'Unknown';
    $email_message_id = upsert_tax_email_message_from_imap($mysqli, [
        'gmail_message_id' => $message_id,
        'gmail_thread_id' => $message_id,
        'gmail_label' => 'IMAP/' . $mailbox,
        'received_at' => $received_at,
        'sender_email' => $from,
        'subject' => $subject,
        'body_preview' => substr($body, 0, 1000),
        'suggested_type' => $type,
        'attachment_count' => count($attachments),
    ]);

    $base_row = [
        'email_message_id' => $email_message_id,
        'gmail_message_id' => $message_id,
        'gmail_thread_id' => $message_id,
        'gmail_label' => 'IMAP/' . $mailbox,
        'received_at' => $received_at,
        'sender_email' => $from,
        'email_subject' => $subject,
        'body_preview' => substr($body, 0, 1000),
        'suggested_type' => $type,
        'suggested_category' => $category,
        'suggested_subcategory' => '',
        'amount' => $amount,
        'currency' => $currency,
        'registry_destination' => '',
        'attachment_count' => count($attachments),
        'parsed_vendor' => tax_extract_vendor($from, $subject),
        'parsed_invoice_no' => tax_extract_invoice_no($text),
        'parsed_invoice_date' => tax_extract_invoice_date($text),
        'parsed_tax_amount' => tax_extract_tax_amount($text),
        'parse_confidence' => $amount > 0 ? 0.55 : 0.2,
    ];

    if (count($attachments) === 0) {
        return ['rows' => [array_merge($base_row, [
            'gmail_attachment_id' => 'message',
            'gmail_part_id' => 'message',
            'attachment_name' => '',
            'attachment_mime' => '',
            'subject' => $subject,
        ])]];
    }

    $rows = [];
    foreach ($attachments as $attachment) {
        $attachment_text = trim((string) ($attachment['filename'] ?? '') . "\n" . $text);
        $attachment_amount = tax_extract_amount($attachment_text);
        $rows[] = array_merge($base_row, [
            'gmail_attachment_id' => 'imap-part:' . (string) ($attachment['part_id'] ?? ''),
            'gmail_part_id' => substr((string) ($attachment['part_id'] ?? ''), 0, 80),
            'attachment_name' => substr((string) ($attachment['filename'] ?? ''), 0, 255),
            'attachment_mime' => substr((string) ($attachment['mime'] ?? ''), 0, 120),
            'attachment_count' => 1,
            'subject' => $subject,
            'amount' => $attachment_amount > 0 ? $attachment_amount : $amount,
            'parsed_invoice_no' => tax_extract_invoice_no($attachment_text),
            'parsed_tax_amount' => tax_extract_tax_amount($attachment_text),
        ]);
    }

    return ['rows' => $rows];
}

function upsert_tax_email_message_from_imap($mysqli, $message)
{
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_messages_tab
          (gmail_message_id, gmail_thread_id, gmail_label, received_at, sender_email, subject, body_preview, suggested_type, attachment_count, parsed_child_count, read_status, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, "Unread", 1)
         ON DUPLICATE KEY UPDATE
           gmail_thread_id = VALUES(gmail_thread_id),
           gmail_label = VALUES(gmail_label),
           received_at = VALUES(received_at),
           sender_email = VALUES(sender_email),
           subject = VALUES(subject),
           body_preview = VALUES(body_preview),
           suggested_type = VALUES(suggested_type),
           attachment_count = VALUES(attachment_count),
           valid = 1,
           updated_at = CURRENT_TIMESTAMP'
    );
    if (!$stmt)
        return 0;
    $stmt->bind_param(
        'ssssssssi',
        $message['gmail_message_id'],
        $message['gmail_thread_id'],
        $message['gmail_label'],
        $message['received_at'],
        $message['sender_email'],
        $message['subject'],
        $message['body_preview'],
        $message['suggested_type'],
        $message['attachment_count']
    );
    $stmt->execute();
    $stmt->close();

    $lookup = $mysqli->prepare('SELECT id FROM fnd_tax_email_messages_tab WHERE gmail_message_id = ? LIMIT 1');
    if (!$lookup)
        return 0;
    $lookup->bind_param('s', $message['gmail_message_id']);
    $lookup->execute();
    $rows = get_result($lookup);
    $lookup->close();
    return (int) ($rows[0]['id'] ?? 0);
}

function tax_imap_decode_header($value)
{
    $decoded = '';
    $parts = imap_mime_header_decode((string) $value);
    foreach ($parts as $part) {
        $charset = strtoupper((string) ($part->charset ?? 'UTF-8'));
        $text = (string) ($part->text ?? '');
        if ($charset !== 'DEFAULT' && $charset !== 'UTF-8' && function_exists('mb_convert_encoding')) {
            $text = mb_convert_encoding($text, 'UTF-8', $charset);
        }
        $decoded .= $text;
    }
    return trim($decoded) ?: trim((string) $value);
}

function tax_imap_fetch_body_text($inbox, $message_no, $structure)
{
    $plain_parts = tax_imap_collect_text_parts($structure, '', 'plain');
    $html_parts = tax_imap_collect_text_parts($structure, '', 'html');
    $parts = count($plain_parts) > 0 ? $plain_parts : $html_parts;
    $body = '';
    foreach ($parts as $part) {
        $chunk = imap_fetchbody($inbox, $message_no, $part['part_id']);
        $body .= "\n" . tax_imap_decode_body($chunk, (int) $part['encoding']);
    }
    if (trim($body) === '') {
        $body = tax_imap_decode_body(imap_body($inbox, $message_no), (int) ($structure->encoding ?? 0));
    }
    return trim(html_entity_decode(strip_tags($body), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function tax_imap_collect_text_parts($part, $prefix = '', $subtype = 'plain')
{
    $items = [];
    $part_no = $prefix === '' ? '1' : $prefix;
    $current_subtype = strtolower((string) ($part->subtype ?? ''));
    $type = (int) ($part->type ?? -1);
    if ($type === 0 && $current_subtype === strtolower($subtype)) {
        $items[] = ['part_id' => $part_no, 'encoding' => (int) ($part->encoding ?? 0)];
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $items = array_merge($items, tax_imap_collect_text_parts($child, $child_no, $subtype));
        }
    }
    return $items;
}

function tax_imap_decode_body($body, $encoding)
{
    $body = (string) $body;
    if ($encoding === 3) {
        $decoded = function_exists('imap_base64') ? imap_base64($body) : false;
        if ($decoded !== false && $decoded !== '') {
            return (string) $decoded;
        }
        $compact = preg_replace('/\s+/', '', $body);
        $decoded = base64_decode((string) $compact, false);
        return $decoded !== false ? (string) $decoded : '';
    }
    if ($encoding === 4) {
        return quoted_printable_decode($body);
    }
    return $body;
}

function tax_imap_collect_attachments($part, $prefix = '')
{
    $items = [];
    $part_no = $prefix === '' ? '1' : $prefix;
    $filename = tax_imap_part_filename($part);
    $disposition = strtolower((string) ($part->disposition ?? ''));
    $mime = tax_imap_part_mime($part);
    if ($filename !== '' && ($disposition === 'attachment' || $disposition === 'inline' || tax_is_invoice_attachment($filename, $mime))) {
        $items[] = [
            'part_id' => $part_no,
            'filename' => $filename,
            'mime' => $mime,
        ];
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $items = array_merge($items, tax_imap_collect_attachments($child, $child_no));
        }
    }
    return $items;
}

function tax_imap_part_filename($part)
{
    foreach (['dparameters', 'parameters'] as $property) {
        if (!isset($part->{$property}) || !is_array($part->{$property})) {
            continue;
        }
        foreach ($part->{$property} as $param) {
            $attribute = strtolower((string) ($param->attribute ?? ''));
            if (($attribute === 'filename' || $attribute === 'name') && trim((string) ($param->value ?? '')) !== '') {
                return substr(tax_imap_decode_header((string) $param->value), 0, 255);
            }
        }
    }
    return '';
}

function tax_imap_part_mime($part)
{
    $primary = [
        0 => 'text',
        1 => 'multipart',
        2 => 'message',
        3 => 'application',
        4 => 'audio',
        5 => 'image',
        6 => 'video',
        7 => 'other',
    ];
    $type = $primary[(int) ($part->type ?? 7)] ?? 'application';
    $subtype = strtolower((string) ($part->subtype ?? 'octet-stream'));
    return $type . '/' . $subtype;
}

function tax_imap_infer_type($text)
{
    $haystack = strtolower((string) $text);
    if (preg_match('/\b(income|payment received|payout|earnings|revenue|admob|play console|apple)\b/', $haystack)) {
        return 'Income';
    }
    return 'Expense';
}

function refresh_tax_email_message_child_counts($mysqli)
{
    $mysqli->query(
        'UPDATE fnd_tax_email_messages_tab m
         SET parsed_child_count = (
           SELECT COUNT(*)
           FROM fnd_tax_email_queue_tab q
           WHERE q.email_message_id = m.id
             AND q.valid = 1
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE m.valid = 1'
    );
}

function tax_gmail_label_queries($label, $exclude_labels = [])
{
    $label = trim((string) $label);
    $variants = array_values(array_unique(array_filter([
        $label,
        strtolower($label),
        ucfirst(strtolower($label)),
    ])));
    $exclude_clause = '';
    if (!is_array($exclude_labels)) {
        $exclude_labels = [$exclude_labels];
    }
    $exclude_labels = array_values(array_unique(array_filter(array_map(function ($value) {
        return trim((string) $value);
    }, $exclude_labels))));
    foreach ($exclude_labels as $exclude_label) {
        $escaped_exclude = tax_gmail_escape_label_query($exclude_label);
        $exclude_clause .= ' -label:' . $escaped_exclude . ' -label:"' . $escaped_exclude . '"';
    }

    $queries = [];
    foreach ($variants as $variant) {
        $escaped = tax_gmail_escape_label_query($variant);
        $queries[] = 'in:anywhere label:' . $escaped . $exclude_clause . ' newer_than:365d';
        $queries[] = 'in:anywhere label:"' . $escaped . '"' . $exclude_clause . ' newer_than:365d';
    }

    return array_values(array_unique($queries));
}

function tax_gmail_escape_label_query($label)
{
    return str_replace('"', '', trim((string) $label));
}

function tax_gmail_search_messages($access_token, $query, $limit = 100)
{
    $limit = max(1, min(500, (int) $limit));
    $messages = [];
    $page_token = '';

    while (count($messages) < $limit) {
        $page_size = min(100, $limit - count($messages));
        $params = [
            'q' => $query,
            'maxResults' => $page_size,
        ];
        if ($page_token !== '') {
            $params['pageToken'] = $page_token;
        }

        $response = tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
        if (!empty($response['error_message'])) {
            return [
                'messages' => $messages,
                'error_message' => $response['error_message'],
            ];
        }

        if (!empty($response['messages']) && is_array($response['messages'])) {
            foreach ($response['messages'] as $message_ref) {
                $messages[] = $message_ref;
                if (count($messages) >= $limit) {
                    break;
                }
            }
        }

        $page_token = (string) ($response['nextPageToken'] ?? '');
        if ($page_token === '') {
            break;
        }
    }

    return ['messages' => $messages];
}

function handle_save_tax_ledger_entry($mysqli)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $id = (int) ($_POST['id'] ?? 0);
    $tax_year = trim((string) ($_POST['tax_year'] ?? ''));
    $date = substr((string) ($_POST['transaction_date'] ?? ''), 0, 10);
    $title = trim((string) ($_POST['title'] ?? ''));
    $category = trim((string) ($_POST['category'] ?? ''));
    $subcategory = trim((string) ($_POST['subcategory'] ?? ''));
    $amount = (float) ($_POST['amount'] ?? 0);
    $currency = strtoupper(trim((string) ($_POST['currency'] ?? 'LKR')));
    $entry_type = trim((string) ($_POST['entry_type'] ?? 'Income'));
    $status = trim((string) ($_POST['status'] ?? 'Ready'));
    $notes = trim((string) ($_POST['notes'] ?? ''));
    $attachment_name = substr(trim((string) ($_POST['attachment_name'] ?? '')), 0, 255);

    if ($tax_year === '' || $date === '' || $title === '' || $category === '' || $amount <= 0 || !in_array($currency, ['LKR', 'USD'], true) || !in_array($entry_type, ['Income', 'Expense'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required tax ledger fields are missing or invalid'], 400);
    }

    if (!in_array($status, ['Ready', 'Review', 'Pending'], true)) {
        $status = 'Ready';
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'UPDATE fnd_tax_ledger_tab
             SET tax_year = ?, transaction_date = ?, title = ?, category = ?, subcategory = ?, amount = ?, currency = ?, entry_type = ?, status = ?, notes = ?, attachment_name = NULLIF(?, ""), updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sssssdsssssi', $tax_year, $date, $title, $category, $subcategory, $amount, $currency, $entry_type, $status, $notes, $attachment_name, $id);
    } else {
        $source = 'Manual';
        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_tax_ledger_tab
              (tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_name, valid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ""), 1)'
        );
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sssssdssssss', $tax_year, $date, $title, $category, $subcategory, $amount, $currency, $entry_type, $source, $status, $notes, $attachment_name);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }

    $saved_id = $id > 0 ? $id : $mysqli->insert_id;
    $stmt->close();
    send_json(['success' => true, 'entry' => get_tax_ledger_by_id($mysqli, $saved_id)]);
}

function handle_delete_tax_ledger_entry($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0)
        send_json(['success' => false, 'error_msg' => 'Ledger id is required'], 400);

    $ledger = null;
    $lookup = $mysqli->prepare('SELECT id, source, entry_type, title, gmail_message_id, gmail_attachment_id, gmail_part_id, attachment_name, attachment_url FROM fnd_tax_ledger_tab WHERE id = ? LIMIT 1');
    if ($lookup) {
        $lookup->bind_param('i', $id);
        $lookup->execute();
        $rows = get_result($lookup);
        $lookup->close();
        if (count($rows) > 0) {
            $ledger = $rows[0];
        }
    }

    $stmt = $mysqli->prepare('UPDATE fnd_tax_ledger_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    if (!$ok) {
        send_json(['success' => false, 'error_msg' => $error], 500);
    }

    $restored_email_queue = tax_restore_email_pending_after_ledger_delete($mysqli, $id, $ledger);
    $imap_move_result = tax_move_deleted_ledger_imap_message_back($mysqli, $ledger);
    $uploadcare_delete_result = tax_delete_ledger_uploadcare_file($mysqli, $ledger);
    send_json([
        'success' => true,
        'restored_email_queue' => $restored_email_queue,
        'gmail_message_id' => (string) ($ledger['gmail_message_id'] ?? ''),
        'imap_move_status' => (string) ($imap_move_result['status'] ?? ''),
        'imap_move_error' => (string) ($imap_move_result['error'] ?? ''),
        'uploadcare_delete_status' => (string) ($uploadcare_delete_result['status'] ?? ''),
        'uploadcare_delete_error' => (string) ($uploadcare_delete_result['error'] ?? ''),
    ]);
}

function tax_delete_ledger_uploadcare_file($mysqli, $ledger)
{
    $url = trim((string) ($ledger['attachment_url'] ?? ''));
    $uuid = tax_uploadcare_uuid_from_url($url);
    if ($uuid === '') {
        return ['status' => $url === '' ? 'uploadcare-delete-skipped-no-url' : 'uploadcare-delete-skipped-non-uploadcare-url'];
    }
    if (!function_exists('curl_init')) {
        return ['error' => 'PHP cURL extension is required to delete Uploadcare files.'];
    }
    $settings = GetGlobalSettings($mysqli);
    $public_key = trim((string) ($settings['tax_uploadcare_public_key'] ?? getenv('UPLOADCARE_PUBLIC_KEY') ?: ''));
    $secret_key = trim((string) ($settings['tax_uploadcare_secret_key'] ?? getenv('UPLOADCARE_SECRET_KEY') ?: ''));
    if ($public_key === '' || $secret_key === '') {
        return ['error' => 'Uploadcare public key and secret key are required to delete uploaded evidence.'];
    }
    $endpoint = 'https://api.uploadcare.com/files/' . rawurlencode($uuid) . '/';
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'DELETE',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.uploadcare-v0.7+json',
            'Authorization: Uploadcare.Simple ' . $public_key . ':' . $secret_key,
        ],
    ]);
    $raw = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $curl_error !== '') {
        return ['error' => 'Uploadcare delete request failed: ' . $curl_error];
    }
    if ($http_code === 200 || $http_code === 202 || $http_code === 204 || $http_code === 404) {
        return ['status' => $http_code === 404 ? 'uploadcare-file-already-missing' : 'uploadcare-deleted'];
    }
    return ['error' => 'Uploadcare delete failed. HTTP ' . $http_code . ': ' . substr((string) $raw, 0, 300)];
}

function tax_uploadcare_uuid_from_url($url)
{
    if (preg_match('~https?://(?:[^/]+\.)?ucarecdn\.com/([0-9a-fA-F-]{36})(?:/|$)~', (string) $url, $match)) {
        return strtolower($match[1]);
    }
    if (preg_match('/\b([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/', (string) $url, $match)) {
        return strtolower($match[1]);
    }
    return '';
}

function tax_move_deleted_ledger_imap_message_back($mysqli, $ledger)
{
    $message_id = trim((string) ($ledger['gmail_message_id'] ?? ''));
    $imap_id = tax_parse_imap_message_id($message_id);
    if (!function_exists('imap_open') || !$imap_id) {
        return ['status' => 'move-skipped'];
    }

    $entry_type = (string) ($ledger['entry_type'] ?? 'Expense') === 'Income' ? 'Income' : 'Expense';
    $target_folder = $entry_type === 'Income' ? 'Income' : 'Expense';
    $original_uid = (int) $imap_id['uid'];
    $subject = trim((string) ($ledger['title'] ?? ''));

    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $username === '' || $password === '') {
        return ['error' => 'IMAP settings are incomplete. Ledger row was deleted but email was not moved.'];
    }

    $target_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $target_folder);
    $source_candidates = $entry_type === 'Income'
        ? ['Income Proceed', 'Expense Proceed']
        : ['Expense Proceed', 'Income Proceed'];
    $errors = [];
    foreach ($source_candidates as $source_candidate) {
        $source_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, $source_candidate);
        $inbox = @imap_open(tax_imap_mailbox_path($host, $port, $encryption, $source_folder), $username, $password);
        if (!$inbox) {
            $errors[] = $source_folder . ': ' . (imap_last_error() ?: 'open failed');
            continue;
        }

        $message_no = $original_uid > 0 ? (int) @imap_msgno($inbox, $original_uid) : 0;
        if ($message_no > 0) {
            $moved = @imap_mail_move($inbox, (string) $original_uid, $target_folder, CP_UID);
            if ($moved) {
                imap_expunge($inbox);
                imap_close($inbox);
                return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
            }
        }

        $matched_message_no = tax_find_imap_message_no_by_subject($inbox, $subject);
        if ($matched_message_no > 0) {
            $moved = @imap_mail_move($inbox, (string) $matched_message_no, $target_folder);
            if ($moved) {
                imap_expunge($inbox);
                imap_close($inbox);
                return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
            }
            $errors[] = $source_folder . ': ' . (imap_last_error() ?: 'move failed');
        } else {
            $errors[] = $source_folder . ': email not found';
        }
        imap_close($inbox);
    }

    return ['error' => 'Unable to restore deleted ledger email from Proceed folder. ' . implode('; ', $errors)];
}

function tax_move_duplicate_imap_message($mysqli, $message_id, $subject)
{
    $imap_id = tax_parse_imap_message_id($message_id);
    if (!function_exists('imap_open') || !$imap_id) {
        return ['status' => 'move-skipped'];
    }

    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $username === '' || $password === '') {
        return ['error' => 'IMAP settings are incomplete. Email was marked duplicate but not moved.'];
    }

    $source_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, (string) $imap_id['mailbox']);
    $target_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, 'Duplicate');
    $inbox = @imap_open(tax_imap_mailbox_path($host, $port, $encryption, $source_folder), $username, $password);
    if (!$inbox) {
        return ['error' => $source_folder . ': ' . (imap_last_error() ?: 'open failed')];
    }

    $uid = (int) $imap_id['uid'];
    $message_no = $uid > 0 ? (int) @imap_msgno($inbox, $uid) : 0;
    if ($message_no > 0 && @imap_mail_move($inbox, (string) $uid, $target_folder, CP_UID)) {
        imap_expunge($inbox);
        imap_close($inbox);
        return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
    }

    $matched_message_no = tax_find_imap_message_no_by_subject($inbox, $subject);
    if ($matched_message_no > 0 && @imap_mail_move($inbox, (string) $matched_message_no, $target_folder)) {
        imap_expunge($inbox);
        imap_close($inbox);
        return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
    }

    $error = imap_last_error() ?: 'email not found';
    imap_close($inbox);
    return ['error' => $source_folder . ': ' . $error];
}

function tax_move_deleted_email_imap_message($mysqli, $message_id, $subject)
{
    $imap_id = tax_parse_imap_message_id($message_id);
    if (!function_exists('imap_open') || !$imap_id) {
        return ['status' => 'move-skipped'];
    }

    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $username === '' || $password === '') {
        return ['error' => 'IMAP settings are incomplete. Email was deleted from queue but not moved.'];
    }

    $source_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, (string) $imap_id['mailbox']);
    $target_folder = tax_resolve_imap_mailbox($host, $port, $encryption, $username, $password, 'Delete');
    $inbox = @imap_open(tax_imap_mailbox_path($host, $port, $encryption, $source_folder), $username, $password);
    if (!$inbox) {
        return ['error' => $source_folder . ': ' . (imap_last_error() ?: 'open failed')];
    }

    $uid = (int) $imap_id['uid'];
    $message_no = $uid > 0 ? (int) @imap_msgno($inbox, $uid) : 0;
    if ($message_no > 0 && @imap_mail_move($inbox, (string) $uid, $target_folder, CP_UID)) {
        imap_expunge($inbox);
        imap_close($inbox);
        return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
    }

    $matched_message_no = tax_find_imap_message_no_by_subject($inbox, $subject);
    if ($matched_message_no > 0 && @imap_mail_move($inbox, (string) $matched_message_no, $target_folder)) {
        imap_expunge($inbox);
        imap_close($inbox);
        return ['status' => 'moved-' . $source_folder . '-to-' . $target_folder];
    }

    $error = imap_last_error() ?: 'email not found';
    imap_close($inbox);
    return ['error' => $source_folder . ': ' . $error];
}

function tax_find_imap_message_no_by_subject($inbox, $subject)
{
    $target = tax_normalize_imap_subject($subject);
    if ($target === '') {
        return 0;
    }

    foreach (tax_imap_message_numbers($inbox) as $message_no) {
        $overview_list = @imap_fetch_overview($inbox, (string) $message_no, 0);
        $overview = is_array($overview_list) && isset($overview_list[0]) ? $overview_list[0] : null;
        if (!$overview) {
            continue;
        }
        $candidate = tax_normalize_imap_subject(tax_imap_decode_header((string) ($overview->subject ?? '')));
        if ($candidate !== '' && ($candidate === $target || strpos($candidate, $target) !== false || strpos($target, $candidate) !== false)) {
            return (int) $message_no;
        }
    }

    return 0;
}

function tax_normalize_imap_subject($subject)
{
    $subject = preg_replace('/^\s*((re|fw|fwd)\s*:\s*)+/i', '', (string) $subject);
    $subject = preg_replace('/\s+/', ' ', trim((string) $subject));
    return strtolower($subject);
}

function tax_restore_email_pending_after_ledger_delete($mysqli, $ledger_id, $ledger)
{
    $restored = 0;
    $update_queue = $mysqli->prepare(
        'UPDATE fnd_tax_email_queue_tab
         SET status = "Pending", ledger_id = NULL, valid = 1, updated_at = CURRENT_TIMESTAMP
         WHERE ledger_id = ?'
    );
    if ($update_queue) {
        $update_queue->bind_param('i', $ledger_id);
        $update_queue->execute();
        $restored += max(0, (int) $update_queue->affected_rows);
        $update_queue->close();
    }

    $gmail_message_id = trim((string) ($ledger['gmail_message_id'] ?? ''));
    if ($gmail_message_id !== '') {
        $gmail_attachment_id = trim((string) ($ledger['gmail_attachment_id'] ?? ''));
        $gmail_part_id = trim((string) ($ledger['gmail_part_id'] ?? ''));
        $attachment_name = trim((string) ($ledger['attachment_name'] ?? ''));
        $update_queue_by_identity = $mysqli->prepare(
            'UPDATE fnd_tax_email_queue_tab
             SET status = "Pending", ledger_id = NULL, valid = 1, updated_at = CURRENT_TIMESTAMP
             WHERE gmail_message_id = ?
               AND (? = "" OR gmail_attachment_id = ? OR gmail_attachment_id IS NULL OR gmail_attachment_id = "")
               AND (? = "" OR gmail_part_id = ? OR gmail_part_id IS NULL OR gmail_part_id = "")
               AND (? = "" OR attachment_name = ? OR attachment_name IS NULL OR attachment_name = "")'
        );
        if ($update_queue_by_identity) {
            $update_queue_by_identity->bind_param('sssssss', $gmail_message_id, $gmail_attachment_id, $gmail_attachment_id, $gmail_part_id, $gmail_part_id, $attachment_name, $attachment_name);
            $update_queue_by_identity->execute();
            $restored += max(0, (int) $update_queue_by_identity->affected_rows);
            $update_queue_by_identity->close();
        }

        $update_message = $mysqli->prepare(
            'UPDATE fnd_tax_email_messages_tab
             SET read_status = "Unread", valid = 1, updated_at = CURRENT_TIMESTAMP
             WHERE gmail_message_id = ?'
        );
        if ($update_message) {
            $update_message->bind_param('s', $gmail_message_id);
            $update_message->execute();
            $update_message->close();
        }
    }

    return $restored;
}

function handle_save_tax_category($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $type = trim((string) ($_POST['type'] ?? ''));
    $name = trim((string) ($_POST['name'] ?? ''));
    $rule_keywords = trim((string) ($_POST['rule_keywords'] ?? ''));
    if (!in_array($type, ['Income', 'Expense'], true) || $name === '') {
        send_json(['success' => false, 'error_msg' => 'Category type and name are required'], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_categories_tab SET type = ?, name = ?, rule_keywords = ?, valid = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sssi', $type, $name, $rule_keywords, $id);
    } else {
        $stmt = $mysqli->prepare('INSERT INTO fnd_tax_categories_tab (type, name, rule_keywords, valid) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE rule_keywords = VALUES(rule_keywords), valid = 1, updated_at = CURRENT_TIMESTAMP');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sss', $type, $name, $rule_keywords);
    }
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'categories' => get_tax_category_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_delete_tax_category($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0)
        send_json(['success' => false, 'error_msg' => 'Category id is required'], 400);
    $stmt = $mysqli->prepare('UPDATE fnd_tax_categories_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'categories' => get_tax_category_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_save_tax_subcategory($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $category_id = (int) ($_POST['category_id'] ?? 0);
    $name = trim((string) ($_POST['name'] ?? ''));
    $rule_keywords = trim((string) ($_POST['rule_keywords'] ?? ''));
    if ($category_id <= 0 || $name === '')
        send_json(['success' => false, 'error_msg' => 'Category and subcategory are required'], 400);

    if ($id > 0) {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_subcategories_tab SET category_id = ?, name = ?, rule_keywords = ?, valid = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('issi', $category_id, $name, $rule_keywords, $id);
    } else {
        $stmt = $mysqli->prepare('INSERT INTO fnd_tax_subcategories_tab (category_id, name, rule_keywords, valid) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE rule_keywords = VALUES(rule_keywords), valid = 1, updated_at = CURRENT_TIMESTAMP');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('iss', $category_id, $name, $rule_keywords);
    }
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'categories' => get_tax_category_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_delete_tax_subcategory($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0)
        send_json(['success' => false, 'error_msg' => 'Subcategory id is required'], 400);
    $stmt = $mysqli->prepare('UPDATE fnd_tax_subcategories_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'categories' => get_tax_category_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_simulate_tax_email($mysqli)
{
    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_queue_tab
          (received_at, sender_email, subject, body_preview, suggested_type, suggested_category, suggested_subcategory, amount, currency, registry_destination, status, valid)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, "Pending", 1)'
    );
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);

    $sender = 'tax.client@example.com';
    $subject = 'Payment Receipt: Corporate Tax Filing';
    $body = 'Client payment received for corporate tax filing advisory.';
    $type = 'Income';
    $category = 'Tax Filing Fees';
    $subcategory = 'Corporate Tax';
    $amount = 125000.00;
    $currency = 'LKR';
    $destination = 'Sampath Bank';
    $stmt->bind_param('ssssssdss', $sender, $subject, $body, $type, $category, $subcategory, $amount, $currency, $destination);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'email_queue' => get_tax_email_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_approve_tax_email($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $tax_year = trim((string) ($_POST['tax_year'] ?? '2025/2026'));

    if ($id > 0) {
        $stmt = $mysqli->prepare('SELECT * FROM fnd_tax_email_queue_tab WHERE id = ? AND valid = 1');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $rows = get_result($stmt);
        $stmt->close();
        if (count($rows) === 0)
            send_json(['success' => false, 'error_msg' => 'Email queue item not found'], 404);
        $mail = $rows[0];
        $mail['upload_evidence'] = ((string) ($_POST['upload_evidence'] ?? '1')) !== '0';
        if ((string) ($mail['status'] ?? '') === 'Approved' && (int) ($mail['ledger_id'] ?? 0) > 0) {
            send_json(['success' => true, 'ledger' => get_tax_ledger_rows($mysqli, $tax_year), 'email_queue' => []]);
        }
    } else {
        $mail = [
            'received_at' => trim((string) ($_POST['received_at'] ?? date('Y-m-d H:i:s'))),
            'subject' => trim((string) ($_POST['subject'] ?? '')),
            'suggested_category' => trim((string) ($_POST['suggested_category'] ?? '')),
            'suggested_subcategory' => trim((string) ($_POST['suggested_subcategory'] ?? '')),
            'amount' => (float) ($_POST['amount'] ?? 0),
            'currency' => strtoupper(trim((string) ($_POST['currency'] ?? 'LKR'))),
            'suggested_type' => trim((string) ($_POST['suggested_type'] ?? 'Expense')),
            'body_preview' => trim((string) ($_POST['body_preview'] ?? '')),
            'gmail_message_id' => trim((string) ($_POST['gmail_message_id'] ?? '')),
            'gmail_attachment_id' => trim((string) ($_POST['gmail_attachment_id'] ?? '')),
            'attachment_name' => trim((string) ($_POST['attachment_name'] ?? '')),
            'attachment_mime' => trim((string) ($_POST['attachment_mime'] ?? '')),
            'upload_evidence' => ((string) ($_POST['upload_evidence'] ?? '1')) !== '0',
        ];
    }

    $date = substr((string) $mail['received_at'], 0, 10);
    $title = (string) $mail['subject'];
    $category = (string) $mail['suggested_category'];
    $subcategory = (string) $mail['suggested_subcategory'];
    $amount = (float) $mail['amount'];
    $currency = (string) $mail['currency'];
    $entry_type = (string) $mail['suggested_type'];
    $source = 'Email';
    $status = 'Ready';
    $notes = (string) $mail['body_preview'];

    if ($title === '' || $category === '' || $amount < 0 || !in_array($currency, ['LKR', 'USD'], true) || !in_array($entry_type, ['Income', 'Expense'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required email approval fields are missing or invalid'], 400);
        send_json(['success' => false, 'error_msg' => 'Extract invoice data before approving. Parsed amount is required.'], 400);
    }

    if (tax_ledger_email_match_exists($mysqli, $date, $title, $amount, $currency, $entry_type)) {
        send_json(['success' => true, 'ledger' => get_tax_ledger_rows($mysqli, $tax_year), 'email_queue' => []]);
    }

    $drive_result = !empty($mail['upload_evidence'])
        ? tax_save_tax_email_evidence_to_drive($mysqli, $mail, $tax_year)
        : ['url' => '', 'error' => '', 'status' => 'skipped'];
    $attachment_url = (string) ($drive_result['url'] ?? '');
    if (!empty($drive_result['error'])) {
        $notes = trim($notes . "\n\nServer evidence upload failed: " . $drive_result['error']);
    }

    $insert = $mysqli->prepare(
        'INSERT INTO fnd_tax_ledger_tab
          (tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    );
    if (!$insert)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $insert->bind_param('sssssdssssss', $tax_year, $date, $title, $category, $subcategory, $amount, $currency, $entry_type, $source, $status, $notes, $attachment_url);
    if (!$insert->execute()) {
        $error = $insert->error ?: $mysqli->error;
        $insert->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }
    $ledger_id = $mysqli->insert_id;
    $insert->close();

    if ($id > 0) {
        $update = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET status = "Approved", ledger_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$update)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $update->bind_param('ii', $ledger_id, $id);
        $update->execute();
        $update->close();
    }

    send_json(['success' => true, 'ledger' => get_tax_ledger_rows($mysqli, $tax_year), 'email_queue' => []]);
}

function tax_payload_row_to_mail($row)
{
    return [
        'received_at' => trim((string) ($row['receivedAt'] ?? $row['received_at'] ?? date('Y-m-d H:i:s'))),
        'sender_email' => trim((string) ($row['senderEmail'] ?? $row['sender_email'] ?? 'unknown')),
        'subject' => trim((string) ($row['subject'] ?? '')),
        'suggested_category' => trim((string) ($row['suggestedCategory'] ?? $row['suggested_category'] ?? '')),
        'suggested_subcategory' => trim((string) ($row['suggestedSubcategory'] ?? $row['suggested_subcategory'] ?? '')),
        'amount' => (float) ($row['amount'] ?? 0),
        'currency' => strtoupper(trim((string) ($row['currency'] ?? 'LKR'))),
        'suggested_type' => trim((string) ($row['suggestedType'] ?? $row['suggested_type'] ?? 'Expense')),
        'body_preview' => trim((string) ($row['bodyPreview'] ?? $row['body_preview'] ?? '')),
        'gmail_message_id' => trim((string) ($row['gmailMessageId'] ?? $row['gmail_message_id'] ?? '')),
        'gmail_thread_id' => trim((string) ($row['gmailThreadId'] ?? $row['gmail_thread_id'] ?? '')),
        'gmail_label' => trim((string) ($row['gmailLabel'] ?? $row['gmail_label'] ?? '')),
        'gmail_attachment_id' => trim((string) ($row['gmailAttachmentId'] ?? $row['gmail_attachment_id'] ?? '')),
        'gmail_part_id' => trim((string) ($row['gmailPartId'] ?? $row['gmail_part_id'] ?? '')),
        'attachment_name' => trim((string) ($row['attachmentName'] ?? $row['attachment_name'] ?? '')),
        'attachment_mime' => trim((string) ($row['attachmentMime'] ?? $row['attachment_mime'] ?? '')),
        'attachment_count' => (int) ($row['attachmentCount'] ?? $row['attachment_count'] ?? 0),
        'parsed_invoice_no' => trim((string) ($row['parsedInvoiceNo'] ?? $row['parsed_invoice_no'] ?? '')),
        'parsed_invoice_date' => trim((string) ($row['parsedInvoiceDate'] ?? $row['parsed_invoice_date'] ?? '')),
        'parsed_vendor' => trim((string) ($row['parsedVendor'] ?? $row['parsed_vendor'] ?? '')),
        'parsed_tax_amount' => isset($row['parsedTaxAmount']) ? (float) $row['parsedTaxAmount'] : (isset($row['parsed_tax_amount']) ? (float) $row['parsed_tax_amount'] : null),
        'parsed_invoice_amount' => isset($row['parsedInvoiceAmount']) ? (float) $row['parsedInvoiceAmount'] : (isset($row['parsed_invoice_amount']) ? (float) $row['parsed_invoice_amount'] : null),
        'parsed_currency' => strtoupper(trim((string) ($row['parsedCurrency'] ?? $row['parsed_currency'] ?? ''))),
        'parsed_payment_details' => trim((string) ($row['parsedPaymentDetails'] ?? $row['parsed_payment_details'] ?? '')),
        'upload_evidence' => !isset($row['uploadEvidence']) || (bool) $row['uploadEvidence'],
    ];
}

function tax_insert_tax_email_ledger_row($mysqli, $tax_year, $mail)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $selected_invoice_date = trim((string) ($mail['parsed_invoice_date'] ?? ''));
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', $selected_invoice_date)
        ? $selected_invoice_date
        : substr((string) $mail['received_at'], 0, 10);
    $title = (string) $mail['subject'];
    $category = (string) $mail['suggested_category'];
    $subcategory = (string) ($mail['suggested_subcategory'] ?? '');
    $amount = (float) $mail['amount'];
    $currency = (string) $mail['currency'];
    $entry_type = (string) $mail['suggested_type'];
    $source = 'Email';
    $status = 'Ready';
    $notes = (string) ($mail['body_preview'] ?? '');
    $parsed_invoice_no = substr(trim((string) ($mail['parsed_invoice_no'] ?? '')), 0, 120);
    $parsed_invoice_date = preg_match('/^\d{4}-\d{2}-\d{2}$/', trim((string) ($mail['parsed_invoice_date'] ?? ''))) ? trim((string) $mail['parsed_invoice_date']) : null;
    $parsed_vendor = substr(trim((string) ($mail['parsed_vendor'] ?? '')), 0, 190);
    $parsed_tax_amount = isset($mail['parsed_tax_amount']) && $mail['parsed_tax_amount'] !== null ? (float) $mail['parsed_tax_amount'] : null;
    $parsed_invoice_amount = isset($mail['parsed_invoice_amount']) && $mail['parsed_invoice_amount'] !== null ? (float) $mail['parsed_invoice_amount'] : null;
    $parsed_currency = substr(strtoupper(trim((string) ($mail['parsed_currency'] ?? ''))), 0, 20);
    $parsed_payment_details = trim((string) ($mail['parsed_payment_details'] ?? ''));

    if ($title === '' || $category === '' || $amount < 0 || !in_array($currency, ['LKR', 'USD'], true) || !in_array($entry_type, ['Income', 'Expense'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required email approval fields are missing or invalid'], 400);
    }

    if (tax_ledger_email_match_exists($mysqli, $date, $title, $amount, $currency, $entry_type)) {
        return ['ledger_id' => 0, 'drive_error' => '', 'drive_url' => '', 'drive_status' => 'duplicate'];
    }

    $drive_result = !empty($mail['upload_evidence'])
        ? tax_save_tax_email_evidence_to_drive($mysqli, $mail, $tax_year)
        : ['url' => '', 'error' => '', 'status' => 'skipped'];
    $attachment_url = (string) ($drive_result['url'] ?? '');
    $attachment_name = substr(trim((string) ($mail['attachment_name'] ?? '')), 0, 255);
    $gmail_message_id = substr(trim((string) ($mail['gmail_message_id'] ?? '')), 0, 190);
    $gmail_attachment_id = substr(trim((string) ($mail['gmail_attachment_id'] ?? '')), 0, 190);
    $gmail_part_id = substr(trim((string) ($mail['gmail_part_id'] ?? '')), 0, 80);
    if (!empty($drive_result['error'])) {
        $notes = trim($notes . "\n\nServer evidence upload failed: " . $drive_result['error']);
    }

    $insert = $mysqli->prepare(
        'INSERT INTO fnd_tax_ledger_tab
          (tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, attachment_name, gmail_message_id, gmail_attachment_id, gmail_part_id, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, parsed_invoice_amount, parsed_currency, parsed_payment_details, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), NULLIF(?, ""), ?, NULLIF(?, ""), ?, ?, NULLIF(?, ""), NULLIF(?, ""), 1)'
    );
    if (!$insert)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $insert->bind_param(
        'sssssdsssssssssssssddss',
        $tax_year,
        $date,
        $title,
        $category,
        $subcategory,
        $amount,
        $currency,
        $entry_type,
        $source,
        $status,
        $notes,
        $attachment_url,
        $attachment_name,
        $gmail_message_id,
        $gmail_attachment_id,
        $gmail_part_id,
        $parsed_invoice_no,
        $parsed_invoice_date,
        $parsed_vendor,
        $parsed_tax_amount,
        $parsed_invoice_amount,
        $parsed_currency,
        $parsed_payment_details
    );
    if (!$insert->execute()) {
        $error = $insert->error ?: $mysqli->error;
        $insert->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }
    $ledger_id = (int) $mysqli->insert_id;
    $insert->close();
    return [
        'ledger_id' => $ledger_id,
        'drive_error' => (string) ($drive_result['error'] ?? ''),
        'drive_url' => (string) ($drive_result['url'] ?? ''),
        'drive_status' => (string) ($drive_result['status'] ?? ''),
    ];
}

function tax_save_tax_email_evidence_to_drive($mysqli, $mail, $tax_year)
{
    $settings = GetGlobalSettings($mysqli);
    if ((int) ($settings['tax_evidence_save_enabled'] ?? 1) !== 1) {
        return ['url' => '', 'error' => '', 'status' => 'disabled'];
    }

    $message_id = trim((string) ($mail['gmail_message_id'] ?? ''));
    $attachment_id = trim((string) ($mail['gmail_attachment_id'] ?? ''));
    $title = trim((string) ($mail['subject'] ?? 'Tax email evidence'));
    $date = substr((string) ($mail['received_at'] ?? date('Y-m-d')), 0, 10);
    $mime = trim((string) ($mail['attachment_mime'] ?? ''));
    $attachment_name = trim((string) ($mail['attachment_name'] ?? ''));
    $entry_type = strtolower(trim((string) ($mail['suggested_type'] ?? 'expense'))) === 'income' ? 'income' : 'expenses';
    $settings['_tax_current_invoice_date'] = (string) ($mail['parsed_invoice_date'] ?? '');
    $settings['_tax_current_invoice_no'] = (string) ($mail['parsed_invoice_no'] ?? '');

    try {
        if (strpos($message_id, 'imap:') === 0 && $attachment_id !== '' && $attachment_id !== 'message') {
            $file = tax_fetch_imap_evidence_bytes($mysqli, $message_id, $attachment_id, $attachment_name, $mime);
            $bytes = (string) ($file['bytes'] ?? '');
            $mime = (string) ($file['mime'] ?? ($mime ?: 'application/octet-stream'));
            $upload_name = tax_evidence_safe_filename($attachment_name !== '' ? $attachment_name : ($date . ' - ' . $title));
        } else {
            $text = trim((string) ($mail['body_preview'] ?? $title));
            $bytes = tax_generate_simple_pdf($title . "\n\n" . $text);
            $mime = 'application/pdf';
            $upload_name = tax_evidence_safe_filename($date . ' - ' . $title . '.pdf');
        }

        if ($bytes === '') {
            return ['url' => '', 'error' => 'Evidence file content is empty', 'status' => 'failed'];
        }

        $result = tax_save_evidence_file_to_server($settings, $tax_year, $entry_type, $upload_name, $mime, $bytes, $message_id . '|' . $attachment_id);
        return ['url' => $result['url'], 'error' => '', 'status' => 'uploaded'];
    } catch (Throwable $error) {
        return ['url' => '', 'error' => $error->getMessage(), 'status' => 'failed'];
    }
}

function tax_save_evidence_file_to_server($settings, $tax_year, $entry_type, $name, $mime, $bytes, $identity)
{
    $safe_name = tax_evidence_safe_filename($name);
    $filename = tax_evidence_filename(
        $safe_name,
        $mime,
        $identity,
        (string) ($settings['_tax_current_invoice_date'] ?? ''),
        (string) ($settings['_tax_current_invoice_no'] ?? '')
    );
    return tax_upload_evidence_file_to_uploadcare($settings, $filename, $mime, $bytes);
}

function tax_evidence_filename($name, $mime, $identity, $invoice_date = '', $invoice_no = '')
{
    $extension = tax_evidence_extension($name, $mime);
    $stem = $name;
    if ($extension !== '' && strtolower(substr($stem, -strlen($extension))) === strtolower($extension)) {
        $stem = substr($stem, 0, -strlen($extension));
    }
    $stem = tax_evidence_safe_filename($stem);
    $prefix_parts = [];
    $safe_date = tax_evidence_safe_filename(preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $invoice_date) ? (string) $invoice_date : '');
    $safe_invoice_no = tax_evidence_safe_filename((string) $invoice_no);
    if ($safe_date !== '') {
        $prefix_parts[] = $safe_date;
    }
    if ($safe_invoice_no !== '') {
        $prefix_parts[] = substr($safe_invoice_no, 0, 60);
    }
    $base = trim(implode('_', array_filter(array_merge($prefix_parts, [substr($stem, 0, 90)]))), '_');
    if ($base === '') {
        $base = 'tax-evidence';
    }
    return substr($base, 0, 160) . '-' . substr(md5((string) $identity), 0, 10) . $extension;
}

function tax_upload_evidence_file_to_uploadcare($settings, $filename, $mime, $bytes)
{
    if (!function_exists('curl_init')) {
        throw new Exception('PHP cURL extension is required for Uploadcare uploads.');
    }
    $public_key = trim((string) ($settings['tax_uploadcare_public_key'] ?? getenv('UPLOADCARE_PUBLIC_KEY') ?: ''));
    if ($public_key === '') {
        throw new Exception('Uploadcare public key is required in Settings.');
    }
    $store = trim((string) ($settings['tax_uploadcare_store'] ?? '1'));
    if (!in_array($store, ['0', '1', 'auto'], true)) {
        $store = '1';
    }
    $tmp = tempnam(sys_get_temp_dir(), 'tax-uploadcare-');
    if ($tmp === false || file_put_contents($tmp, $bytes) === false) {
        throw new Exception('Failed to prepare temporary Uploadcare file.');
    }
    $ch = curl_init('https://upload.uploadcare.com/base/');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 90,
        CURLOPT_POSTFIELDS => [
            'UPLOADCARE_PUB_KEY' => $public_key,
            'UPLOADCARE_STORE' => $store,
            'file' => curl_file_create($tmp, $mime ?: 'application/octet-stream', $filename),
        ],
    ]);
    $raw = curl_exec($ch);
    $curl_error = curl_error($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @unlink($tmp);
    if ($raw === false || $curl_error !== '') {
        throw new Exception('Uploadcare request failed: ' . $curl_error);
    }
    $response = json_decode((string) $raw, true);
    if ($http_code < 200 || $http_code >= 300 || !is_array($response) || empty($response['file'])) {
        throw new Exception('Uploadcare upload failed. HTTP ' . $http_code . ': ' . substr((string) $raw, 0, 300));
    }
    $uuid = trim((string) $response['file']);
    return ['path' => '', 'url' => 'https://ucarecdn.com/' . rawurlencode($uuid) . '/'];
}

function tax_fetch_imap_evidence_bytes($mysqli, $message_id, $attachment_id, $name, $mime)
{
    if (!function_exists('imap_open')) {
        throw new Exception('PHP IMAP extension is not enabled on this server.');
    }
    $imap_id = tax_parse_imap_message_id($message_id);
    if (!$imap_id) {
        throw new Exception('Invalid IMAP message id for evidence upload.');
    }

    $settings = GetGlobalSettings($mysqli);
    $mailbox = trim((string) ($imap_id['mailbox'] ?: ($settings['tax_imap_mailbox'] ?? getenv('TAX_IMAP_MAILBOX') ?: 'INBOX')));
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $mailbox === '' || $username === '' || $password === '') {
        throw new Exception('Tax IMAP settings are incomplete.');
    }

    $mailbox_path = tax_imap_mailbox_path($host, $port, $encryption, $mailbox);
    $inbox = @imap_open($mailbox_path, $username, $password);
    if (!$inbox) {
        throw new Exception('IMAP connection failed: ' . (imap_last_error() ?: 'unknown error'));
    }
    $current_uidvalidity = tax_imap_uidvalidity($inbox, $mailbox_path);
    if ((int) $imap_id['uidvalidity'] > 0 && $current_uidvalidity > 0 && (int) $imap_id['uidvalidity'] !== $current_uidvalidity) {
        imap_close($inbox);
        throw new Exception('IMAP UIDVALIDITY changed. Run Sync Email again to refresh attachment links.');
    }
    $message_no = imap_msgno($inbox, (int) $imap_id['uid']);
    if ($message_no <= 0) {
        imap_close($inbox);
        throw new Exception('IMAP message was not found in the mailbox.');
    }
    $structure = imap_fetchstructure($inbox, $message_no);
    if (!$structure) {
        imap_close($inbox);
        throw new Exception('Failed to read IMAP message structure.');
    }

    $part_id = str_replace('imap-part:', '', (string) $attachment_id);
    $part = tax_imap_find_part($structure, $part_id);
    if (!$part) {
        imap_close($inbox);
        throw new Exception('IMAP attachment part was not found.');
    }
    $content = imap_fetchbody($inbox, $message_no, $part_id);
    $decoded = tax_imap_decode_body($content, (int) ($part->encoding ?? 0));
    imap_close($inbox);

    return [
        'bytes' => (string) $decoded,
        'mime' => $mime !== '' ? $mime : tax_imap_part_mime($part),
        'name' => $name !== '' ? $name : tax_imap_part_filename($part),
    ];
}

function tax_evidence_safe_filename($name)
{
    $name = trim(preg_replace('/[\\\\\/:*?"<>|\r\n]+/', ' ', (string) $name));
    $name = preg_replace('/\s+/', ' ', $name);
    if ($name === '')
        $name = 'Tax email evidence';
    return substr($name, 0, 140);
}

function tax_evidence_extension($filename, $mime)
{
    $extension = strtolower((string) pathinfo((string) $filename, PATHINFO_EXTENSION));
    if ($extension !== '') {
        return '.' . preg_replace('/[^a-z0-9]+/', '', $extension);
    }
    $map = [
        'application/pdf' => '.pdf',
        'image/png' => '.png',
        'image/jpeg' => '.jpg',
        'image/webp' => '.webp',
        'text/html' => '.html',
        'text/plain' => '.txt',
        'text/csv' => '.csv',
        'application/vnd.ms-excel' => '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => '.xlsx',
        'message/rfc822' => '.eml',
    ];
    return $map[strtolower((string) $mime)] ?? '.bin';
}

function tax_generate_simple_pdf($text)
{
    $text = preg_replace('/[^\x09\x0A\x0D\x20-\x7E]/', '', (string) $text);
    $lines = [];
    foreach (preg_split('/\r\n|\r|\n/', wordwrap($text, 95, "\n", true)) as $line) {
        $lines[] = substr($line, 0, 110);
    }
    if (count($lines) === 0)
        $lines[] = 'Tax email evidence';

    $content = "BT\n/F1 10 Tf\n50 790 Td\n14 TL\n";
    foreach (array_slice($lines, 0, 52) as $line) {
        $content .= '(' . str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line) . ") Tj\nT*\n";
    }
    $content .= "ET";

    $objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        "5 0 obj\n<< /Length " . strlen($content) . " >>\nstream\n$content\nendstream\nendobj\n",
    ];

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $object) {
        $offsets[] = strlen($pdf);
        $pdf .= $object;
    }
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= count($objects); $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    return $pdf;
}

function handle_approve_tax_email_group($mysqli)
{
    $tax_year = trim((string) ($_POST['tax_year'] ?? '2025/2026'));
    $gmail_message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
    $ids_json = (string) ($_POST['ids'] ?? '[]');
    $rows_json = (string) ($_POST['rows'] ?? '[]');
    $payload_rows = json_decode($rows_json, true);
    if (!is_array($payload_rows))
        $payload_rows = [];
    $ids = json_decode($ids_json, true);
    if (!is_array($ids))
        $ids = [];
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($id) {
        return $id > 0;
    })));

    if ($gmail_message_id !== '' && count($payload_rows) > 0) {
        $drive_errors = [];
        $drive_urls = [];
        $drive_statuses = [];
        $first_mail = null;
        foreach ($payload_rows as $payload_row) {
            if (!is_array($payload_row))
                continue;
            $mail = tax_payload_row_to_mail($payload_row);
            if ($first_mail === null) {
                $first_mail = $mail;
            }
            $insert_result = tax_insert_tax_email_ledger_row($mysqli, $tax_year, $mail);
            if (!empty($insert_result['drive_error'])) {
                $drive_errors[] = (string) $insert_result['drive_error'];
            }
            if (!empty($insert_result['drive_url'])) {
                $drive_urls[] = (string) $insert_result['drive_url'];
            }
            if (!empty($insert_result['drive_status'])) {
                $drive_statuses[] = (string) $insert_result['drive_status'];
            }
        }
        if (is_array($first_mail)) {
            tax_mark_payload_gmail_message_processed($mysqli, $first_mail);
        }

        send_json([
            'success' => true,
            'ledger' => get_tax_ledger_rows($mysqli, $tax_year),
            'email_queue' => [],
            'drive_errors' => array_values(array_unique($drive_errors)),
            'drive_uploaded_count' => count($drive_urls),
            'drive_statuses' => array_values(array_unique($drive_statuses)),
            'drive_urls' => $drive_urls,
        ]);
    }

    if ($gmail_message_id === '' || count($ids) === 0) {
        send_json(['success' => false, 'error_msg' => 'Email group and child approvals are required'], 400);
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    $stmt = $mysqli->prepare(
        'SELECT *
         FROM fnd_tax_email_queue_tab
         WHERE valid = 1
           AND status = "Pending"
           AND gmail_message_id = ?
           AND id IN (' . $placeholders . ')
         ORDER BY id ASC'
    );
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $params = array_merge([$gmail_message_id], $ids);
    $bind_params = ['s' . $types];
    foreach ($params as $key => $value) {
        $bind_params[] = &$params[$key];
    }
    call_user_func_array([$stmt, 'bind_param'], $bind_params);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();

    if (count($rows) !== count($ids)) {
        send_json(['success' => false, 'error_msg' => 'Some selected email items are missing or already approved. Refresh and try again.'], 409);
    }

    $ledger_ids = [];
    foreach ($rows as $mail) {
        $date = substr((string) $mail['received_at'], 0, 10);
        $title = (string) $mail['subject'];
        $category = (string) $mail['suggested_category'];
        $subcategory = (string) ($mail['suggested_subcategory'] ?? '');
        $amount = (float) $mail['amount'];
        $currency = (string) $mail['currency'];
        $entry_type = (string) $mail['suggested_type'];
        $source = 'Email';
        $status = 'Ready';
        $notes = (string) ($mail['body_preview'] ?? '');

        if ($title === '' || $category === '' || $amount < 0 || !in_array($currency, ['LKR', 'USD'], true) || !in_array($entry_type, ['Income', 'Expense'], true)) {
            send_json(['success' => false, 'error_msg' => 'Required email approval fields are missing or invalid'], 400);
        }

        if (tax_ledger_email_match_exists($mysqli, $date, $title, $amount, $currency, $entry_type)) {
            $ledger_ids[(int) $mail['id']] = 0;
            continue;
        }

        $drive_result = tax_save_tax_email_evidence_to_drive($mysqli, $mail, $tax_year);
        $attachment_url = (string) ($drive_result['url'] ?? '');
        if (!empty($drive_result['error'])) {
            $notes = trim($notes . "\n\nServer evidence upload failed: " . $drive_result['error']);
        }

        $insert = $mysqli->prepare(
            'INSERT INTO fnd_tax_ledger_tab
              (tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, valid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        );
        if (!$insert)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $insert->bind_param('sssssdssssss', $tax_year, $date, $title, $category, $subcategory, $amount, $currency, $entry_type, $source, $status, $notes, $attachment_url);
        if (!$insert->execute()) {
            $error = $insert->error ?: $mysqli->error;
            $insert->close();
            send_json(['success' => false, 'error_msg' => $error], 500);
        }
        $ledger_ids[(int) $mail['id']] = (int) $mysqli->insert_id;
        $insert->close();
    }

    foreach ($ids as $id) {
        $ledger_id = (int) ($ledger_ids[$id] ?? 0);
        $update = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET status = "Approved", ledger_id = NULLIF(?, 0), updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$update)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $update->bind_param('ii', $ledger_id, $id);
        $update->execute();
        $update->close();
    }

    $message_update = $mysqli->prepare('UPDATE fnd_tax_email_messages_tab SET read_status = "Processed", updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
    if ($message_update) {
        $message_update->bind_param('s', $gmail_message_id);
        $message_update->execute();
        $message_update->close();
    }

    send_json(['success' => true, 'ledger' => get_tax_ledger_rows($mysqli, $tax_year), 'email_queue' => get_tax_email_rows($mysqli)]);
}

function handle_update_tax_email($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $suggested_type = trim((string) ($_POST['suggested_type'] ?? ''));
    $suggested_category = trim((string) ($_POST['suggested_category'] ?? ''));
    $suggested_subcategory = trim((string) ($_POST['suggested_subcategory'] ?? ''));
    $amount = (float) ($_POST['amount'] ?? 0);
    $currency = strtoupper(trim((string) ($_POST['currency'] ?? 'LKR')));
    $registry_destination = trim((string) ($_POST['registry_destination'] ?? ''));
    $subject = trim((string) ($_POST['subject'] ?? ''));
    $body_preview = trim((string) ($_POST['body_preview'] ?? ''));

    if ($id <= 0 || !in_array($suggested_type, ['Income', 'Expense'], true) || $suggested_category === '' || $amount < 0 || !in_array($currency, ['LKR', 'USD'], true) || $subject === '') {
        send_json(['success' => false, 'error_msg' => 'Required email queue fields are missing or invalid'], 400);
    }

    $stmt = $mysqli->prepare(
        'UPDATE fnd_tax_email_queue_tab
         SET subject = ?, body_preview = ?, suggested_type = ?, suggested_category = ?, suggested_subcategory = ?, amount = ?, currency = ?, registry_destination = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = "Pending" AND valid = 1'
    );
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('sssssdssi', $subject, $body_preview, $suggested_type, $suggested_category, $suggested_subcategory, $amount, $currency, $registry_destination, $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();

    send_json($ok ? ['success' => true, 'email_queue' => get_tax_email_rows($mysqli)] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_get_tax_email_attachment($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'SELECT gmail_message_id, gmail_attachment_id, attachment_name, attachment_mime
             FROM fnd_tax_email_queue_tab
             WHERE id = ? AND valid = 1
             LIMIT 1'
        );
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $rows = get_result($stmt);
        $stmt->close();
        if (count($rows) === 0)
            send_json(['success' => false, 'error_msg' => 'Email queue item not found'], 404);
        $row = $rows[0];
        $message_id = (string) ($row['gmail_message_id'] ?? '');
        $attachment_id = (string) ($row['gmail_attachment_id'] ?? '');
        $mime = (string) ($row['attachment_mime'] ?? 'application/octet-stream');
        $name = (string) ($row['attachment_name'] ?? 'attachment');
    } else {
        $message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
        $attachment_id = trim((string) ($_POST['gmail_attachment_id'] ?? ''));
        $mime = trim((string) ($_POST['attachment_mime'] ?? 'application/octet-stream'));
        $name = trim((string) ($_POST['attachment_name'] ?? 'attachment'));
    }
    if ($message_id === '' || $attachment_id === '') {
        send_json(['success' => false, 'error_msg' => 'This queue row does not have an email attachment to view'], 400);
    }

    if (strpos($message_id, 'imap:') === 0) {
        handle_get_tax_imap_attachment($mysqli, $message_id, $attachment_id, $mime, $name);
    }

    $settings = GetGlobalSettings($mysqli);
    $access_token = tax_gmail_access_token($settings);
    if ($access_token === '') {
        send_json(['success' => false, 'error_msg' => 'Unable to get Gmail access token. Check refresh token/client credentials.'], 400);
    }

    if ($attachment_id === 'message') {
        $message = tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
        if (!empty($message['error_message'])) {
            send_json(['success' => false, 'error_msg' => 'Failed to fetch Gmail message: ' . $message['error_message']], 500);
        }
        $html = tax_collect_gmail_html($message['payload'] ?? []);
        $text = tax_collect_gmail_text($message['payload'] ?? []);
        $content = $html !== '' ? $html : '<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124;">' . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</pre>';
        send_json([
            'success' => true,
            'fileName' => $name ?: 'Email body',
            'mimeType' => 'text/html',
            'dataUrl' => 'data:text/html;base64,' . base64_encode($content),
        ]);
    }

    $attachment = tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
    if (!empty($attachment['error_message'])) {
        $inline = tax_find_inline_gmail_attachment($access_token, $message_id, $attachment_id, $name);
        if (!empty($inline['error_message'])) {
            send_json(['success' => false, 'error_msg' => 'Failed to fetch Gmail attachment: ' . $attachment['error_message'] . '. Inline fallback: ' . $inline['error_message']], 500);
        }
        $attachment = $inline;
    }

    $base64 = (string) ($attachment['data'] ?? '');
    if ($base64 === '') {
        send_json(['success' => false, 'error_msg' => 'Gmail attachment content is empty'], 500);
    }
    $base64 = strtr($base64, '-_', '+/');

    send_json([
        'success' => true,
        'fileName' => $name,
        'mimeType' => $mime ?: 'application/octet-stream',
        'dataUrl' => 'data:' . ($mime ?: 'application/octet-stream') . ';base64,' . $base64,
    ]);
}

function handle_get_tax_imap_attachment($mysqli, $message_id, $attachment_id, $mime, $name)
{
    if (!function_exists('imap_open')) {
        send_json(['success' => false, 'error_msg' => 'PHP IMAP extension is not enabled on this server.'], 500);
    }
    $imap_id = tax_parse_imap_message_id($message_id);
    if (!$imap_id) {
        send_json(['success' => false, 'error_msg' => 'Invalid IMAP message id.'], 400);
    }

    $settings = GetGlobalSettings($mysqli);
    $host = trim((string) ($settings['tax_imap_host'] ?? getenv('TAX_IMAP_HOST') ?: 'mail.rermedapps.com'));
    $port = (int) ($settings['tax_imap_port'] ?? getenv('TAX_IMAP_PORT') ?: 993);
    $encryption = strtolower(trim((string) ($settings['tax_imap_encryption'] ?? getenv('TAX_IMAP_ENCRYPTION') ?: 'ssl')));
    $mailbox = trim((string) ($imap_id['mailbox'] ?: ($settings['tax_imap_mailbox'] ?? getenv('TAX_IMAP_MAILBOX') ?: 'INBOX')));
    $username = trim((string) ($settings['tax_imap_username'] ?? getenv('TAX_IMAP_USERNAME') ?: 'tax@rermedapps.com'));
    $password = (string) ($settings['tax_imap_password'] ?? getenv('TAX_IMAP_PASSWORD') ?: '');
    if ($host === '' || $mailbox === '' || $username === '' || $password === '') {
        send_json(['success' => false, 'error_msg' => 'Tax IMAP settings are incomplete.'], 400);
    }

    $mailbox_path = tax_imap_mailbox_path($host, $port, $encryption, $mailbox);
    $inbox = @imap_open($mailbox_path, $username, $password);
    if (!$inbox) {
        send_json(['success' => false, 'error_msg' => 'IMAP connection failed: ' . (imap_last_error() ?: 'unknown error')], 400);
    }

    $current_uidvalidity = tax_imap_uidvalidity($inbox, $mailbox_path);
    if ((int) $imap_id['uidvalidity'] > 0 && $current_uidvalidity > 0 && (int) $imap_id['uidvalidity'] !== $current_uidvalidity) {
        imap_close($inbox);
        send_json(['success' => false, 'error_msg' => 'IMAP UIDVALIDITY changed. Run Sync Email again to refresh attachment links.'], 409);
    }
    $uid = (int) $imap_id['uid'];
    $message_no = imap_msgno($inbox, $uid);
    if ($message_no <= 0) {
        imap_close($inbox);
        send_json(['success' => false, 'error_msg' => 'IMAP message was not found in the mailbox.'], 404);
    }
    $structure = imap_fetchstructure($inbox, $message_no);
    if (!$structure) {
        imap_close($inbox);
        send_json(['success' => false, 'error_msg' => 'Failed to read IMAP message structure.'], 500);
    }

    if ($attachment_id === 'message') {
        $text = tax_imap_fetch_body_text($inbox, $message_no, $structure);
        imap_close($inbox);
        $content = '<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124;">' . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</pre>';
        send_json([
            'success' => true,
            'fileName' => $name ?: 'Email body',
            'mimeType' => 'text/html',
            'dataUrl' => 'data:text/html;base64,' . base64_encode($content),
        ]);
    }

    $part_id = str_replace('imap-part:', '', (string) $attachment_id);
    $part = tax_imap_find_part($structure, $part_id);
    if (!$part) {
        imap_close($inbox);
        send_json(['success' => false, 'error_msg' => 'IMAP attachment part was not found.'], 404);
    }

    $content = imap_fetchbody($inbox, $message_no, $part_id);
    $decoded = tax_imap_decode_body($content, (int) ($part->encoding ?? 0));
    imap_close($inbox);
    $declared_mime = $mime ?: tax_imap_part_mime($part);
    $actual_mime = tax_sniff_attachment_mime($decoded, $declared_mime);
    $text_preview = '';
    if ($declared_mime === 'application/pdf' && $actual_mime !== 'application/pdf') {
        $text_preview = 'This attachment is named as a PDF, but the downloaded bytes are ' . $actual_mime . '. Run Sync Email again to refresh stale IMAP attachment links. If it still happens, the email attachment itself is not a valid PDF.';
    }

    send_json([
        'success' => true,
        'fileName' => $name ?: tax_imap_part_filename($part) ?: 'attachment',
        'mimeType' => $actual_mime,
        'dataUrl' => 'data:' . $actual_mime . ';base64,' . base64_encode($decoded),
        'textPreview' => $text_preview,
    ]);
}

function tax_parse_imap_message_id($message_id)
{
    if (preg_match('/^imap:(.*):(\d+):(\d+)$/', (string) $message_id, $matches)) {
        return ['mailbox' => (string) $matches[1], 'uidvalidity' => (int) $matches[2], 'uid' => (int) $matches[3]];
    }
    if (preg_match('/^imap:(.*):(\d+)$/', (string) $message_id, $matches)) {
        return ['mailbox' => (string) $matches[1], 'uidvalidity' => 0, 'uid' => (int) $matches[2]];
    }
    return null;
}

function tax_sniff_attachment_mime($bytes, $fallback)
{
    $bytes = (string) $bytes;
    $head = substr($bytes, 0, 64);
    if (strncmp($head, '%PDF-', 5) === 0) {
        return 'application/pdf';
    }
    if (strncmp($head, "\x89PNG\r\n\x1a\n", 8) === 0) {
        return 'image/png';
    }
    if (substr($head, 0, 3) === "\xff\xd8\xff") {
        return 'image/jpeg';
    }
    if (preg_match('/^\s*</', $head)) {
        return 'text/xml';
    }
    if (substr($head, 0, 2) === "\x30\x82") {
        return 'application/pkcs7-signature';
    }
    return $fallback ?: 'application/octet-stream';
}

function tax_imap_find_part($part, $target, $prefix = '')
{
    $part_no = $prefix === '' ? '1' : $prefix;
    if ($part_no === (string) $target) {
        return $part;
    }
    if (isset($part->parts) && is_array($part->parts)) {
        foreach ($part->parts as $index => $child) {
            $child_no = $prefix === '' ? (string) ($index + 1) : $prefix . '.' . ($index + 1);
            $found = tax_imap_find_part($child, $target, $child_no);
            if ($found) {
                return $found;
            }
        }
    }
    return null;
}

function tax_find_inline_gmail_attachment($access_token, $message_id, $attachment_id, $name)
{
    $message = tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
    if (!empty($message['error_message']))
        return ['error_message' => $message['error_message']];

    $part = tax_find_gmail_part($message['payload'] ?? [], $attachment_id, $name);
    if (!$part)
        return ['error_message' => 'Attachment part was not found in the Gmail message payload'];

    $data = (string) ($part['body']['data'] ?? '');
    if ($data === '') {
        $real_attachment_id = (string) ($part['body']['attachmentId'] ?? '');
        if ($real_attachment_id !== '' && $real_attachment_id !== $attachment_id) {
            return tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
        }
        return ['error_message' => 'Attachment part exists but has no inline data'];
    }

    return ['data' => $data];
}

function tax_find_gmail_part($part, $attachment_id, $name)
{
    $part_attachment_id = (string) ($part['body']['attachmentId'] ?? '');
    $part_filename = (string) ($part['filename'] ?? '');
    if (($attachment_id !== '' && $part_attachment_id === $attachment_id) || ($name !== '' && $part_filename === $name)) {
        return $part;
    }

    foreach (($part['parts'] ?? []) as $child) {
        $found = tax_find_gmail_part($child, $attachment_id, $name);
        if ($found)
            return $found;
    }

    return null;
}

function handle_delete_tax_email($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $gmail_message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
    if ($id <= 0 && $gmail_message_id === '') {
        send_json(['success' => false, 'error_msg' => 'Email id or Gmail message id is required'], 400);
    }

    $message_id_for_move = $gmail_message_id;
    $subject_for_move = '';
    if ($id > 0) {
        $lookup_stmt = $mysqli->prepare('SELECT gmail_message_id, subject FROM fnd_tax_email_queue_tab WHERE id = ? LIMIT 1');
        if ($lookup_stmt) {
            $lookup_stmt->bind_param('i', $id);
            $lookup_stmt->execute();
            $result = $lookup_stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $message_id_for_move = $message_id_for_move !== '' ? $message_id_for_move : trim((string) ($row['gmail_message_id'] ?? ''));
                $subject_for_move = trim((string) ($row['subject'] ?? ''));
            }
            $lookup_stmt->close();
        }
    }
    if ($subject_for_move === '' && $message_id_for_move !== '') {
        $lookup_stmt = $mysqli->prepare('SELECT subject FROM fnd_tax_email_queue_tab WHERE gmail_message_id = ? ORDER BY id ASC LIMIT 1');
        if ($lookup_stmt) {
            $lookup_stmt->bind_param('s', $message_id_for_move);
            $lookup_stmt->execute();
            $result = $lookup_stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $subject_for_move = trim((string) ($row['subject'] ?? ''));
            }
            $lookup_stmt->close();
        }
    }
    $move_result = $message_id_for_move !== '' ? tax_move_deleted_email_imap_message($mysqli, $message_id_for_move, $subject_for_move) : ['status' => 'move-skipped'];

    $updated = 0;
    $error = '';
    if ($id > 0) {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET valid = 0, status = "Rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('i', $id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
        }
        $updated += max(0, (int) $stmt->affected_rows);
        $stmt->close();
    }

    if ($error === '' && $gmail_message_id !== '') {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET valid = 0, status = "Rejected", updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('s', $gmail_message_id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
        }
        $updated += max(0, (int) $stmt->affected_rows);
        $stmt->close();
    }

    if ($error === '' && $gmail_message_id !== '') {
        $message_stmt = $mysqli->prepare('UPDATE fnd_tax_email_messages_tab SET read_status = "Processed", valid = 1, updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
        if ($message_stmt) {
            $message_stmt->bind_param('s', $gmail_message_id);
            $message_stmt->execute();
            $message_stmt->close();
        }
    }

    send_json($error === '' ? [
        'success' => true,
        'updated' => $updated,
        'imap_move_status' => $move_result['status'] ?? '',
        'imap_move_error' => $move_result['error'] ?? '',
        'email_queue' => get_tax_email_rows($mysqli),
    ] : ['success' => false, 'error_msg' => $error], $error === '' ? 200 : 500);
}

function handle_mark_tax_email_duplicate($mysqli)
{
    $id = (int) ($_POST['id'] ?? 0);
    $gmail_message_id = trim((string) ($_POST['gmail_message_id'] ?? ''));
    if ($id <= 0 && $gmail_message_id === '') {
        send_json(['success' => false, 'error_msg' => 'Email id or Gmail message id is required'], 400);
    }

    $message_id_for_move = $gmail_message_id;
    $subject_for_move = '';
    if ($id > 0) {
        $lookup_stmt = $mysqli->prepare('SELECT gmail_message_id, subject FROM fnd_tax_email_queue_tab WHERE id = ? LIMIT 1');
        if ($lookup_stmt) {
            $lookup_stmt->bind_param('i', $id);
            $lookup_stmt->execute();
            $result = $lookup_stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $message_id_for_move = $message_id_for_move !== '' ? $message_id_for_move : trim((string) ($row['gmail_message_id'] ?? ''));
                $subject_for_move = trim((string) ($row['subject'] ?? ''));
            }
            $lookup_stmt->close();
        }
    }
    if ($subject_for_move === '' && $message_id_for_move !== '') {
        $lookup_stmt = $mysqli->prepare('SELECT subject FROM fnd_tax_email_queue_tab WHERE gmail_message_id = ? ORDER BY id ASC LIMIT 1');
        if ($lookup_stmt) {
            $lookup_stmt->bind_param('s', $message_id_for_move);
            $lookup_stmt->execute();
            $result = $lookup_stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $subject_for_move = trim((string) ($row['subject'] ?? ''));
            }
            $lookup_stmt->close();
        }
    }
    $move_result = $message_id_for_move !== '' ? tax_move_duplicate_imap_message($mysqli, $message_id_for_move, $subject_for_move) : ['status' => 'move-skipped'];

    $updated = 0;
    $error = '';
    if ($id > 0) {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET valid = 0, status = "Rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('i', $id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
        }
        $updated += max(0, (int) $stmt->affected_rows);
        $stmt->close();
    }

    if ($error === '' && $gmail_message_id !== '') {
        $stmt = $mysqli->prepare('UPDATE fnd_tax_email_queue_tab SET valid = 0, status = "Rejected", updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
        if (!$stmt)
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('s', $gmail_message_id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
        }
        $updated += max(0, (int) $stmt->affected_rows);
        $stmt->close();
    }

    if ($error === '' && $gmail_message_id !== '') {
        $message_stmt = $mysqli->prepare('UPDATE fnd_tax_email_messages_tab SET read_status = "Processed", valid = 1, updated_at = CURRENT_TIMESTAMP WHERE gmail_message_id = ?');
        if ($message_stmt) {
            $message_stmt->bind_param('s', $gmail_message_id);
            $message_stmt->execute();
            $message_stmt->close();
        }
    }

    send_json($error === '' ? [
        'success' => true,
        'updated' => $updated,
        'imap_move_status' => $move_result['status'] ?? '',
        'imap_move_error' => $move_result['error'] ?? '',
        'email_queue' => get_tax_email_rows($mysqli),
    ] : ['success' => false, 'error_msg' => $error], $error === '' ? 200 : 500);
}

function seed_tax_defaults($mysqli)
{
    $mysqli->query("INSERT IGNORE INTO fnd_tax_categories_tab (type, name) VALUES ('Income','Unknown'),('Expense','Unknown'),('Income','Tax Filing Fees'),('Income','Consulting Services'),('Expense','SaaS & Licenses'),('Expense','Office Operations')");
}

function ensure_tax_ledger_attachment_name_column($mysqli)
{
    return;
}

function get_tax_ledger_rows($mysqli, $tax_year)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $stmt = $mysqli->prepare(
        'SELECT id, tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, attachment_name, gmail_message_id, gmail_attachment_id, gmail_part_id, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, created_at, updated_at
         FROM fnd_tax_ledger_tab
         WHERE valid = 1 AND tax_year = ?
         ORDER BY transaction_date DESC, id DESC'
    );
    if (!$stmt)
        send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('s', $tax_year);
    if (!$stmt->execute())
        send_json(['success' => false, 'error_msg' => $stmt->error ?: $mysqli->error], 500);
    $rows = get_result($stmt);
    $stmt->close();
    return array_map('map_tax_ledger_row', $rows);
}

function get_tax_ledger_by_id($mysqli, $id)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $stmt = $mysqli->prepare('SELECT id, tax_year, transaction_date, title, category, subcategory, amount, currency, entry_type, source, status, notes, attachment_url, attachment_name, gmail_message_id, gmail_attachment_id, gmail_part_id, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, created_at, updated_at FROM fnd_tax_ledger_tab WHERE id = ?');
    if (!$stmt)
        return null;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return count($rows) ? map_tax_ledger_row($rows[0]) : null;
}

function get_tax_category_rows($mysqli)
{
    $categories = [];
    $stmt = $mysqli->prepare('SELECT id, type, name, rule_keywords FROM fnd_tax_categories_tab WHERE valid = 1 ORDER BY type ASC, name ASC');
    if (!$stmt || !$stmt->execute())
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load categories'], 500);
    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $category = [
            'id' => (string) $row['id'],
            'type' => (string) $row['type'],
            'name' => (string) $row['name'],
            'ruleKeywords' => (string) ($row['rule_keywords'] ?? ''),
            'subcategories' => [],
        ];
        $categories[$category['id']] = $category;
    }

    if (count($categories) === 0)
        return [];
    $ids = implode(',', array_map('intval', array_keys($categories)));
    $sub_rows = [];
    $result = $mysqli->query("SELECT id, category_id, name, rule_keywords FROM fnd_tax_subcategories_tab WHERE valid = 1 AND category_id IN ($ids) ORDER BY name ASC");
    if ($result) {
        while ($row = $result->fetch_assoc())
            $sub_rows[] = $row;
    }
    foreach ($sub_rows as $row) {
        $category_id = (string) $row['category_id'];
        if (isset($categories[$category_id])) {
            $categories[$category_id]['subcategories'][] = [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'ruleKeywords' => (string) ($row['rule_keywords'] ?? ''),
            ];
        }
    }
    return array_values($categories);
}

function get_tax_email_rows($mysqli)
{
    $stmt = $mysqli->prepare(
        'SELECT id, email_message_id, received_at, sender_email, subject, body_preview, suggested_type, suggested_category, suggested_subcategory, amount, currency, registry_destination, status, ledger_id, gmail_message_id, gmail_attachment_id, gmail_part_id, gmail_label, attachment_name, attachment_mime, attachment_count, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, parse_confidence
         FROM fnd_tax_email_queue_tab
         WHERE valid = 1
           AND status IN ("Pending", "Approved")
           AND sender_email <> "tax.client@example.com"
         ORDER BY received_at DESC, id DESC'
    );
    if (!$stmt || !$stmt->execute())
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load email queue'], 500);
    $rows = get_result($stmt);
    $stmt->close();
    return array_map('map_tax_email_row', $rows);
}

function map_tax_gmail_parsed_email_row($mysqli, $row)
{
    $date = substr((string) $row['received_at'], 0, 10);
    $status = tax_ledger_email_match_exists(
        $mysqli,
        $date,
        (string) $row['subject'],
        (float) $row['amount'],
        (string) $row['currency'],
        (string) $row['suggested_type']
    ) ? 'Approved' : 'Pending';

    return [
        'id' => 'gmail:' . md5((string) $row['gmail_message_id'] . '|' . (string) $row['gmail_attachment_id'] . '|' . (string) $row['attachment_name']),
        'receivedAt' => (string) $row['received_at'],
        'senderEmail' => (string) $row['sender_email'],
        'emailSubject' => (string) ($row['email_subject'] ?? $row['subject']),
        'subject' => (string) $row['subject'],
        'bodyPreview' => (string) ($row['body_preview'] ?? ''),
        'suggestedType' => (string) $row['suggested_type'],
        'suggestedCategory' => (string) $row['suggested_category'],
        'suggestedSubcategory' => (string) ($row['suggested_subcategory'] ?? ''),
        'amount' => (float) $row['amount'],
        'currency' => (string) $row['currency'],
        'registryDestination' => (string) ($row['registry_destination'] ?? ''),
        'status' => $status,
        'ledgerId' => '',
        'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
        'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
        'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
        'gmailLabel' => (string) ($row['gmail_label'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
        'attachmentMime' => (string) ($row['attachment_mime'] ?? ''),
        'attachmentCount' => (int) ($row['attachment_count'] ?? 0),
        'parsedInvoiceNo' => (string) ($row['parsed_invoice_no'] ?? ''),
        'parsedInvoiceDate' => (string) ($row['parsed_invoice_date'] ?? ''),
        'parsedVendor' => (string) ($row['parsed_vendor'] ?? ''),
        'parsedTaxAmount' => isset($row['parsed_tax_amount']) ? (float) $row['parsed_tax_amount'] : null,
        'parsedInvoiceAmount' => isset($row['parsed_invoice_amount']) && $row['parsed_invoice_amount'] !== null ? (float) $row['parsed_invoice_amount'] : ((float) ($row['amount'] ?? 0) > 0 ? (float) $row['amount'] : null),
        'parsedCurrency' => (string) ($row['parsed_currency'] ?? ($row['currency'] ?? '')),
        'parsedPaymentDetails' => (string) ($row['parsed_payment_details'] ?? ''),
        'parseConfidence' => isset($row['parse_confidence']) ? (float) $row['parse_confidence'] : null,
    ];
}

function tax_ledger_email_match_exists($mysqli, $date, $title, $amount, $currency, $entry_type)
{
    $stmt = $mysqli->prepare(
        'SELECT id FROM fnd_tax_ledger_tab
         WHERE valid = 1
           AND source = "Email"
           AND transaction_date = ?
           AND title = ?
           AND ABS(amount - ?) < 0.01
           AND currency = ?
           AND entry_type = ?
         LIMIT 1'
    );
    if (!$stmt)
        return false;
    $stmt->bind_param('ssdss', $date, $title, $amount, $currency, $entry_type);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return count($rows) > 0;
}

function tax_clean_email_subject($value)
{
    $subject = html_entity_decode((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $subject = preg_replace('/^\s*((fwd?|fw|re)\s*:\s*)+/i', '', $subject);
    $subject = preg_replace('/\s+/', ' ', $subject);
    return trim((string) $subject);
}

function tax_ledger_email_subject_exists($mysqli, $title, $entry_type)
{
    $title = tax_clean_email_subject($title);
    $entry_type = trim((string) $entry_type);
    if ($title === '' || !in_array($entry_type, ['Income', 'Expense'], true)) {
        return false;
    }
    $stmt = $mysqli->prepare(
        'SELECT title FROM fnd_tax_ledger_tab
         WHERE valid = 1
           AND source = "Email"
           AND entry_type = ?
         ORDER BY id DESC
         LIMIT 200'
    );
    if (!$stmt)
        return false;
    $stmt->bind_param('s', $entry_type);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    $normalized_title = strtolower($title);
    foreach ($rows as $row) {
        $ledger_title = strtolower(tax_clean_email_subject($row['title'] ?? ''));
        if ($ledger_title === $normalized_title || strpos($ledger_title, $normalized_title) === 0 || strpos($normalized_title, $ledger_title) === 0) {
            return true;
        }
    }
    return false;
}

function map_tax_ledger_row($row)
{
    return [
        'id' => (string) $row['id'],
        'taxYear' => (string) $row['tax_year'],
        'transactionDate' => (string) $row['transaction_date'],
        'title' => (string) $row['title'],
        'category' => (string) $row['category'],
        'subcategory' => (string) ($row['subcategory'] ?? ''),
        'amount' => (float) $row['amount'],
        'currency' => (string) $row['currency'],
        'entryType' => (string) $row['entry_type'],
        'source' => (string) $row['source'],
        'status' => (string) $row['status'],
        'notes' => (string) ($row['notes'] ?? ''),
        'attachmentUrl' => (string) ($row['attachment_url'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
        'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
        'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
        'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
        'parsedInvoiceNo' => (string) ($row['parsed_invoice_no'] ?? ''),
        'parsedInvoiceDate' => (string) ($row['parsed_invoice_date'] ?? ''),
        'parsedVendor' => (string) ($row['parsed_vendor'] ?? ''),
        'parsedTaxAmount' => isset($row['parsed_tax_amount']) && $row['parsed_tax_amount'] !== null ? (float) $row['parsed_tax_amount'] : null,
        'parsedInvoiceAmount' => isset($row['parsed_invoice_amount']) && $row['parsed_invoice_amount'] !== null ? (float) $row['parsed_invoice_amount'] : ((float) ($row['amount'] ?? 0) > 0 ? (float) $row['amount'] : null),
        'parsedCurrency' => (string) ($row['parsed_currency'] ?? ($row['currency'] ?? '')),
        'parsedPaymentDetails' => (string) ($row['parsed_payment_details'] ?? ''),
    ];
}

function tax_find_ledger_row_for_email_row($mysqli, $row)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $gmail_message_id = trim((string) ($row['gmail_message_id'] ?? ''));
    $gmail_attachment_id = trim((string) ($row['gmail_attachment_id'] ?? ''));
    $gmail_part_id = trim((string) ($row['gmail_part_id'] ?? ''));
    if ($gmail_message_id !== '') {
        $stmt = $mysqli->prepare(
            'SELECT id FROM fnd_tax_ledger_tab
             WHERE valid = 1
               AND source = "Email"
               AND gmail_message_id = ?
               AND (gmail_attachment_id = ? OR gmail_attachment_id IS NULL OR gmail_attachment_id = "")
               AND (gmail_part_id = ? OR gmail_part_id IS NULL OR gmail_part_id = "")
             ORDER BY id DESC
             LIMIT 1'
        );
        if ($stmt) {
            $stmt->bind_param('sss', $gmail_message_id, $gmail_attachment_id, $gmail_part_id);
            $stmt->execute();
            $rows = get_result($stmt);
            $stmt->close();
            if (count($rows) > 0) {
                return get_tax_ledger_by_id($mysqli, (int) $rows[0]['id']);
            }
        }
    }

    $title = tax_clean_email_subject($row['subject'] ?? '');
    $entry_type = trim((string) ($row['suggested_type'] ?? ''));
    if ($title === '' || !in_array($entry_type, ['Income', 'Expense'], true)) {
        return null;
    }
    $stmt = $mysqli->prepare(
        'SELECT id, title FROM fnd_tax_ledger_tab
         WHERE valid = 1
           AND source = "Email"
           AND entry_type = ?
         ORDER BY id DESC
         LIMIT 200'
    );
    if (!$stmt)
        return null;
    $stmt->bind_param('s', $entry_type);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    $normalized_title = strtolower($title);
    foreach ($rows as $candidate) {
        $ledger_title = strtolower(tax_clean_email_subject($candidate['title'] ?? ''));
        if ($ledger_title === $normalized_title || strpos($ledger_title, $normalized_title) === 0 || strpos($normalized_title, $ledger_title) === 0) {
            return get_tax_ledger_by_id($mysqli, (int) $candidate['id']);
        }
    }
    return null;
}

function tax_find_deleted_ledger_row_for_email_row($mysqli, $row)
{
    ensure_tax_ledger_attachment_name_column($mysqli);
    $gmail_message_id = trim((string) ($row['gmail_message_id'] ?? ''));
    $gmail_attachment_id = trim((string) ($row['gmail_attachment_id'] ?? ''));
    $gmail_part_id = trim((string) ($row['gmail_part_id'] ?? ''));
    $attachment_name = trim((string) ($row['attachment_name'] ?? ''));
    if ($gmail_message_id === '') {
        return null;
    }

    $stmt = $mysqli->prepare(
        'SELECT id FROM fnd_tax_ledger_tab
         WHERE valid = 0
           AND source = "Email"
           AND gmail_message_id = ?
           AND (? = "" OR gmail_attachment_id = ? OR gmail_attachment_id IS NULL OR gmail_attachment_id = "")
           AND (? = "" OR gmail_part_id = ? OR gmail_part_id IS NULL OR gmail_part_id = "")
           AND (? = "" OR attachment_name = ? OR attachment_name IS NULL OR attachment_name = "")
         ORDER BY updated_at DESC, id DESC
         LIMIT 1'
    );
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param('sssssss', $gmail_message_id, $gmail_attachment_id, $gmail_attachment_id, $gmail_part_id, $gmail_part_id, $attachment_name, $attachment_name);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    if (count($rows) > 0) {
        return get_tax_ledger_by_id($mysqli, (int) $rows[0]['id']);
    }

    $fallback = $mysqli->prepare(
        'SELECT id, title
         FROM fnd_tax_ledger_tab
         WHERE valid = 0
           AND source = "Email"
           AND gmail_message_id = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 10'
    );
    if (!$fallback) {
        return null;
    }
    $fallback->bind_param('s', $gmail_message_id);
    $fallback->execute();
    $fallback_rows = get_result($fallback);
    $fallback->close();
    if (count($fallback_rows) === 1) {
        return get_tax_ledger_by_id($mysqli, (int) $fallback_rows[0]['id']);
    }

    $title = strtolower(tax_clean_email_subject($row['subject'] ?? ''));
    foreach ($fallback_rows as $candidate) {
        $ledger_title = strtolower(tax_clean_email_subject($candidate['title'] ?? ''));
        if ($title !== '' && $ledger_title !== '' && ($ledger_title === $title || strpos($ledger_title, $title) === 0 || strpos($title, $ledger_title) === 0)) {
            return get_tax_ledger_by_id($mysqli, (int) $candidate['id']);
        }
    }
    return null;
}

function map_tax_live_gmail_row($mysqli, $row)
{
    $date = substr((string) $row['received_at'], 0, 10);
    $ledger_row = tax_find_ledger_row_for_email_row($mysqli, $row);
    $previous_ledger_row = $ledger_row ? null : tax_find_deleted_ledger_row_for_email_row($mysqli, $row);
    $prefill_row = $ledger_row ?: $previous_ledger_row;
    $status = ($ledger_row || tax_ledger_email_match_exists(
        $mysqli,
        $date,
        (string) $row['subject'],
        (float) $row['amount'],
        (string) $row['currency'],
        (string) $row['suggested_type']
    )) ? 'Approved' : 'Pending';
    $subject = $prefill_row['title'] ?? (string) ($row['subject'] ?? '');
    $category = $prefill_row['category'] ?? (string) ($row['suggested_category'] ?? '');
    $amount = isset($prefill_row['amount']) ? (float) $prefill_row['amount'] : (float) ($row['amount'] ?? 0);
    $currency = (string) ($prefill_row['currency'] ?? ($row['currency'] ?? 'LKR'));
    $prefill_invoice_date = '';
    if (is_array($prefill_row)) {
        $prefill_invoice_date = trim((string) ($prefill_row['parsedInvoiceDate'] ?? ''));
        if ($prefill_invoice_date === '') {
            $prefill_invoice_date = trim((string) ($prefill_row['transactionDate'] ?? ''));
        }
    }

    return [
        'id' => 'gmail:' . md5((string) $row['gmail_message_id'] . '|' . (string) $row['gmail_part_id'] . '|' . (string) $row['gmail_attachment_id'] . '|' . (string) $row['attachment_name']),
        'receivedAt' => (string) ($row['received_at'] ?? ''),
        'senderEmail' => (string) ($row['sender_email'] ?? ''),
        'emailSubject' => (string) ($row['email_subject'] ?? $row['subject'] ?? ''),
        'subject' => $subject,
        'bodyPreview' => (string) ($row['body_preview'] ?? ''),
        'suggestedType' => (string) ($row['suggested_type'] ?? 'Expense'),
        'suggestedCategory' => $category,
        'suggestedSubcategory' => (string) ($row['suggested_subcategory'] ?? ''),
        'amount' => $amount,
        'currency' => $currency,
        'registryDestination' => (string) ($row['registry_destination'] ?? ''),
        'status' => $status,
        'ledgerId' => isset($ledger_row['id']) ? (string) $ledger_row['id'] : '',
        'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
        'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
        'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
        'gmailLabel' => (string) ($row['gmail_label'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
        'attachmentMime' => (string) ($row['attachment_mime'] ?? ''),
        'attachmentCount' => (int) ($row['attachment_count'] ?? 0),
        'parsedInvoiceNo' => (string) ($prefill_row['parsedInvoiceNo'] ?? ($row['parsed_invoice_no'] ?? '')),
        'parsedInvoiceDate' => $prefill_invoice_date !== '' ? $prefill_invoice_date : (string) ($row['parsed_invoice_date'] ?? ''),
        'parsedVendor' => (string) ($prefill_row['parsedVendor'] ?? ($row['parsed_vendor'] ?? '')),
        'parsedTaxAmount' => isset($prefill_row['parsedTaxAmount']) && $prefill_row['parsedTaxAmount'] !== null ? (float) $prefill_row['parsedTaxAmount'] : (isset($row['parsed_tax_amount']) && $row['parsed_tax_amount'] !== null ? (float) $row['parsed_tax_amount'] : null),
        'parsedInvoiceAmount' => isset($prefill_row['parsedInvoiceAmount']) && $prefill_row['parsedInvoiceAmount'] !== null ? (float) $prefill_row['parsedInvoiceAmount'] : (isset($prefill_row['amount']) ? (float) $prefill_row['amount'] : (isset($row['parsed_invoice_amount']) && $row['parsed_invoice_amount'] !== null ? (float) $row['parsed_invoice_amount'] : null)),
        'parsedCurrency' => (string) ($prefill_row['parsedCurrency'] ?? ($prefill_row['currency'] ?? ($row['parsed_currency'] ?? ''))),
        'parsedPaymentDetails' => (string) ($prefill_row['parsedPaymentDetails'] ?? ($row['parsed_payment_details'] ?? '')),
        'parseConfidence' => isset($row['parse_confidence']) && $row['parse_confidence'] !== null ? (float) $row['parse_confidence'] : null,
    ];
}

function map_tax_email_row($row)
{
    return [
        'id' => (string) $row['id'],
        'receivedAt' => (string) $row['received_at'],
        'senderEmail' => (string) $row['sender_email'],
        'subject' => (string) $row['subject'],
        'bodyPreview' => (string) ($row['body_preview'] ?? ''),
        'suggestedType' => (string) $row['suggested_type'],
        'suggestedCategory' => (string) $row['suggested_category'],
        'suggestedSubcategory' => (string) ($row['suggested_subcategory'] ?? ''),
        'amount' => (float) $row['amount'],
        'currency' => (string) $row['currency'],
        'registryDestination' => (string) ($row['registry_destination'] ?? ''),
        'status' => (string) $row['status'],
        'ledgerId' => isset($row['ledger_id']) ? (string) $row['ledger_id'] : '',
        'gmailMessageId' => (string) ($row['gmail_message_id'] ?? ''),
        'gmailAttachmentId' => (string) ($row['gmail_attachment_id'] ?? ''),
        'gmailPartId' => (string) ($row['gmail_part_id'] ?? ''),
        'gmailLabel' => (string) ($row['gmail_label'] ?? ''),
        'attachmentName' => (string) ($row['attachment_name'] ?? ''),
        'attachmentMime' => (string) ($row['attachment_mime'] ?? ''),
        'attachmentCount' => (int) ($row['attachment_count'] ?? 0),
        'parsedInvoiceNo' => (string) ($row['parsed_invoice_no'] ?? ''),
        'parsedInvoiceDate' => (string) ($row['parsed_invoice_date'] ?? ''),
        'parsedVendor' => (string) ($row['parsed_vendor'] ?? ''),
        'parsedTaxAmount' => isset($row['parsed_tax_amount']) ? (float) $row['parsed_tax_amount'] : null,
        'parsedInvoiceAmount' => isset($row['parsed_invoice_amount']) && $row['parsed_invoice_amount'] !== null ? (float) $row['parsed_invoice_amount'] : ((float) ($row['amount'] ?? 0) > 0 ? (float) $row['amount'] : null),
        'parsedCurrency' => (string) ($row['parsed_currency'] ?? ($row['currency'] ?? '')),
        'parsedPaymentDetails' => (string) ($row['parsed_payment_details'] ?? ''),
        'parseConfidence' => isset($row['parse_confidence']) ? (float) $row['parse_confidence'] : null,
    ];
}

function tax_gmail_access_token($settings)
{
    $client_id = (string) ($settings['tax_gmail_client_id'] ?? '');
    $client_secret = (string) ($settings['tax_gmail_client_secret'] ?? '');
    $refresh_token = (string) ($settings['tax_gmail_refresh_token'] ?? '');
    if ($client_id === '' || $client_secret === '' || $refresh_token === '')
        return '';

    return '';
    $response = tax_http_request('', [
        'method' => 'POST',
        'headers' => ['Content-Type: application/x-www-form-urlencoded'],
        'body' => http_build_query([
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'refresh_token' => $refresh_token,
            'grant_type' => 'refresh_token',
        ]),
    ]);
    return (string) ($response['json']['access_token'] ?? '');
}

function tax_removed_gmail_endpoint()
{
    return '';
}

function tax_gmail_api_get($access_token, $url)
{
    return ['error_message' => 'Gmail API has been removed from this project.'];

    $response = tax_http_request($url, [
        'headers' => ['Authorization: Bearer ' . $access_token],
    ]);
    $json = is_array($response['json'] ?? null) ? $response['json'] : [];
    if ($response['error'] !== '') {
        $json['error_message'] = $response['error'];
    } elseif (($response['status'] ?? 0) >= 400) {
        $json['error_message'] = (string) ($json['error']['message'] ?? ('Gmail API HTTP ' . $response['status']));
    }
    return $json;
}

function tax_http_request($url, $options = [])
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_TIMEOUT, 45);
    if (($options['method'] ?? 'GET') === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
    }
    if (!empty($options['headers'])) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $options['headers']);
    }
    if (isset($options['body'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $options['body']);
    }
    $body = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode((string) $body, true);
    return ['status' => $status, 'body' => $body, 'json' => is_array($json) ? $json : [], 'error' => $error];
}

function tax_email_attachment_exists($mysqli, $gmail_message_id, $gmail_part_id, $gmail_attachment_id, $attachment_name = '')
{
    $stmt = $mysqli->prepare(
        'SELECT id
         FROM fnd_tax_email_queue_tab
         WHERE gmail_message_id = ?
           AND gmail_part_id = ?
           AND gmail_attachment_id = ?
           AND attachment_name = ?
         LIMIT 1'
    );
    if (!$stmt)
        return false;
    $stmt->bind_param('ssss', $gmail_message_id, $gmail_part_id, $gmail_attachment_id, $attachment_name);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return count($rows) > 0;
}

function tax_email_message_is_processed($mysqli, $gmail_message_id)
{
    $stmt = $mysqli->prepare('SELECT id FROM fnd_tax_email_messages_tab WHERE gmail_message_id = ? AND read_status = "Processed" AND valid = 1 LIMIT 1');
    if (!$stmt)
        return false;
    $stmt->bind_param('s', $gmail_message_id);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    return count($rows) > 0;
}

function tax_mark_payload_gmail_message_processed($mysqli, $mail)
{
    $gmail_message_id = trim((string) ($mail['gmail_message_id'] ?? ''));
    if ($gmail_message_id === '') {
        return;
    }

    $gmail_thread_id = trim((string) ($mail['gmail_thread_id'] ?? ''));
    $gmail_label = trim((string) ($mail['gmail_label'] ?? ''));
    $received_at = trim((string) ($mail['received_at'] ?? ''));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}/', $received_at)) {
        $received_at = date('Y-m-d H:i:s');
    }
    $sender_email = substr(trim((string) ($mail['sender_email'] ?? 'unknown')), 0, 190);
    $subject = substr(trim((string) ($mail['subject'] ?? '(No subject)')), 0, 255);
    $body_preview = substr(trim((string) ($mail['body_preview'] ?? '')), 0, 1000);
    $suggested_type = in_array((string) ($mail['suggested_type'] ?? ''), ['Income', 'Expense'], true)
        ? (string) $mail['suggested_type']
        : 'Expense';
    $attachment_count = (int) ($mail['attachment_count'] ?? 0);

    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_messages_tab
          (gmail_message_id, gmail_thread_id, gmail_label, received_at, sender_email, subject, body_preview, suggested_type, attachment_count, parsed_child_count, read_status, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, "Processed", 1)
         ON DUPLICATE KEY UPDATE
           gmail_thread_id = VALUES(gmail_thread_id),
           gmail_label = VALUES(gmail_label),
           received_at = VALUES(received_at),
           sender_email = VALUES(sender_email),
           subject = VALUES(subject),
           body_preview = VALUES(body_preview),
           suggested_type = VALUES(suggested_type),
           attachment_count = VALUES(attachment_count),
           read_status = "Processed",
           valid = 1,
           updated_at = CURRENT_TIMESTAMP'
    );
    if (!$stmt)
        return;
    $stmt->bind_param('ssssssssi', $gmail_message_id, $gmail_thread_id, $gmail_label, $received_at, $sender_email, $subject, $body_preview, $suggested_type, $attachment_count);
    $stmt->execute();
    $stmt->close();
}

function clear_pending_tax_email_children_for_message($mysqli, $gmail_message_id)
{
    $stmt = $mysqli->prepare(
        'UPDATE fnd_tax_email_queue_tab
         SET valid = 0, updated_at = CURRENT_TIMESTAMP
         WHERE gmail_message_id = ?
           AND status = "Pending"
           AND valid = 1'
    );
    if (!$stmt)
        return;
    $stmt->bind_param('s', $gmail_message_id);
    $stmt->execute();
    $stmt->close();
}

function upsert_tax_email_message_from_gmail($mysqli, $message, $type, $label)
{
    $headers = $message['payload']['headers'] ?? [];
    $subject = tax_header_value($headers, 'Subject');
    $from = tax_header_value($headers, 'From');
    $date_header = tax_header_value($headers, 'Date');
    $received_at = date('Y-m-d H:i:s', $date_header ? strtotime($date_header) : time());
    $body = trim(tax_collect_gmail_text($message['payload'] ?? []));
    $snippet = trim((string) ($message['snippet'] ?? ''));
    $attachments = tax_collect_gmail_attachments($message['payload'] ?? []);
    $gmail_message_id = (string) ($message['id'] ?? '');
    $gmail_thread_id = (string) ($message['threadId'] ?? '');
    $sender_email = substr($from ?: 'unknown', 0, 190);
    $email_subject = substr($subject ?: '(No subject)', 0, 255);
    $body_preview = substr($snippet ?: $body, 0, 1000);
    $attachment_count = count($attachments);

    $stmt = $mysqli->prepare(
        'INSERT INTO fnd_tax_email_messages_tab
          (gmail_message_id, gmail_thread_id, gmail_label, received_at, sender_email, subject, body_preview, suggested_type, attachment_count, parsed_child_count, read_status, valid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, "Unread", 1)
         ON DUPLICATE KEY UPDATE
           gmail_thread_id = VALUES(gmail_thread_id),
           gmail_label = VALUES(gmail_label),
           received_at = VALUES(received_at),
           sender_email = VALUES(sender_email),
           subject = VALUES(subject),
           body_preview = VALUES(body_preview),
           suggested_type = VALUES(suggested_type),
           attachment_count = VALUES(attachment_count),
           valid = 1,
           updated_at = CURRENT_TIMESTAMP'
    );
    if (!$stmt)
        return 0;
    $stmt->bind_param('ssssssssi', $gmail_message_id, $gmail_thread_id, $label, $received_at, $sender_email, $email_subject, $body_preview, $type, $attachment_count);
    $stmt->execute();
    $stmt->close();

    $lookup = $mysqli->prepare('SELECT id FROM fnd_tax_email_messages_tab WHERE gmail_message_id = ? LIMIT 1');
    if (!$lookup)
        return 0;
    $lookup->bind_param('s', $gmail_message_id);
    $lookup->execute();
    $rows = get_result($lookup);
    $lookup->close();
    return (int) ($rows[0]['id'] ?? 0);
}

function tax_parse_gmail_message($mysqli, $message, $type, $label, $access_token = '')
{
    $headers = $message['payload']['headers'] ?? [];
    $subject = tax_header_value($headers, 'Subject');
    $from = tax_header_value($headers, 'From');
    $date_header = tax_header_value($headers, 'Date');
    $received_at = date('Y-m-d H:i:s', $date_header ? strtotime($date_header) : time());
    $body = trim(tax_collect_gmail_text($message['payload'] ?? []));
    $snippet = trim((string) ($message['snippet'] ?? ''));
    $text = trim($subject . "\n" . $snippet . "\n" . $body);
    $attachments = tax_collect_gmail_attachments($message['payload'] ?? []);
    $email_amount = tax_extract_amount($text);
    $currency = tax_extract_currency($text);
    $email_category = 'Unknown';
    $base_row = [
        'gmail_message_id' => (string) ($message['id'] ?? ''),
        'gmail_thread_id' => (string) ($message['threadId'] ?? ''),
        'gmail_label' => $label,
        'received_at' => $received_at,
        'sender_email' => substr($from ?: 'unknown', 0, 190),
        'email_subject' => substr($subject ?: '(No subject)', 0, 255),
        'body_preview' => substr($snippet ?: $body, 0, 1000),
        'suggested_type' => $type,
        'suggested_category' => $email_category,
        'suggested_subcategory' => '',
        'currency' => $currency,
        'registry_destination' => '',
        'attachment_count' => count($attachments),
        'parsed_vendor' => tax_extract_vendor($from, $subject),
        'parsed_invoice_date' => tax_extract_invoice_date($text),
        'parse_confidence' => $email_amount > 0 ? 0.62 : 0.25,
    ];

    if (count($attachments) === 0) {
        $matched_category = tax_match_category_rule($mysqli, $type, $text, $email_category);
        return [
            array_merge($base_row, [
                'gmail_attachment_id' => 'message',
                'gmail_part_id' => 'message',
                'attachment_name' => '',
                'attachment_mime' => '',
                'subject' => substr($subject ?: '(No subject)', 0, 255),
                'amount' => $email_amount,
                'suggested_category' => $matched_category,
                'suggested_subcategory' => '',
                'parsed_invoice_no' => tax_extract_invoice_no($text),
                'parsed_tax_amount' => tax_extract_tax_amount($text),
            ])
        ];
    }

    $rows = [];
    foreach ($attachments as $index => $attachment) {
        $attachment_body_text = tax_extract_attachment_text($access_token, (string) ($message['id'] ?? ''), $attachment);
        $attachment_text = trim($attachment['filename'] . "\n" . $attachment_body_text . "\n" . $text);
        $matched_category = tax_match_category_rule($mysqli, $type, $attachment_text, $email_category);
        $attachment_amount = tax_extract_amount($attachment_text);
        $nested_attachment_count = (strtolower((string) $attachment['mimeType']) === 'message/rfc822' || substr(strtolower((string) $attachment['filename']), -4) === '.eml')
            ? tax_count_eml_invoice_attachments($attachment_body_text)
            : 1;
        $attachment_id = (string) ($attachment['attachmentId'] ?? '');
        if ($attachment_id === '') {
            $attachment_id = 'inline-' . md5(strtolower((string) $attachment['filename']));
        }
        $rows[] = array_merge($base_row, [
            'gmail_attachment_id' => $attachment_id,
            'gmail_part_id' => substr((string) ($attachment['partId'] ?? ''), 0, 80),
            'attachment_name' => substr($attachment['filename'], 0, 255),
            'attachment_mime' => substr($attachment['mimeType'], 0, 120),
            'attachment_count' => $nested_attachment_count,
            'subject' => substr($subject ?: '(No subject)', 0, 255),
            'suggested_category' => $matched_category,
            'suggested_subcategory' => '',
            'amount' => $attachment_amount > 0 ? $attachment_amount : $email_amount,
            'parsed_invoice_no' => tax_extract_invoice_no($attachment_text),
            'parsed_tax_amount' => tax_extract_tax_amount($attachment_text),
        ]);
    }

    return $rows;
}

function insert_tax_email_queue_from_gmail($mysqli, $row)
{
    if (
        tax_email_attachment_exists(
            $mysqli,
            (string) ($row['gmail_message_id'] ?? ''),
            (string) ($row['gmail_part_id'] ?? ''),
            (string) ($row['gmail_attachment_id'] ?? ''),
            (string) ($row['attachment_name'] ?? '')
        )
    ) {
        if ((int) ($row['email_message_id'] ?? 0) > 0) {
            $link = $mysqli->prepare(
                'UPDATE fnd_tax_email_queue_tab
                 SET email_message_id = ?
                 WHERE gmail_message_id = ?
                   AND gmail_part_id = ?
                   AND gmail_attachment_id = ?
                   AND attachment_name = ?
                   AND (email_message_id IS NULL OR email_message_id = 0)'
            );
            if ($link) {
                $link->bind_param('issss', $row['email_message_id'], $row['gmail_message_id'], $row['gmail_part_id'], $row['gmail_attachment_id'], $row['attachment_name']);
                $link->execute();
                $link->close();
            }
        }
        return 'duplicate';
    }

    if (upgrade_legacy_tax_email_attachment_identity($mysqli, $row)) {
        return 'duplicate';
    }

    $stmt = $mysqli->prepare(
        'INSERT IGNORE INTO fnd_tax_email_queue_tab
          (email_message_id, received_at, sender_email, subject, body_preview, suggested_type, suggested_category, suggested_subcategory, amount, currency, registry_destination, status, valid, gmail_message_id, gmail_thread_id, gmail_attachment_id, gmail_part_id, gmail_label, attachment_name, attachment_mime, attachment_count, parsed_invoice_no, parsed_invoice_date, parsed_vendor, parsed_tax_amount, parse_confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "Pending", 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    if (!$stmt)
        return false;
    $stmt->bind_param(
        'isssssssdsssssssssisssdd',
        $row['email_message_id'],
        $row['received_at'],
        $row['sender_email'],
        $row['subject'],
        $row['body_preview'],
        $row['suggested_type'],
        $row['suggested_category'],
        $row['suggested_subcategory'],
        $row['amount'],
        $row['currency'],
        $row['registry_destination'],
        $row['gmail_message_id'],
        $row['gmail_thread_id'],
        $row['gmail_attachment_id'],
        $row['gmail_part_id'],
        $row['gmail_label'],
        $row['attachment_name'],
        $row['attachment_mime'],
        $row['attachment_count'],
        $row['parsed_invoice_no'],
        $row['parsed_invoice_date'],
        $row['parsed_vendor'],
        $row['parsed_tax_amount'],
        $row['parse_confidence']
    );
    $ok = $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    if (!$ok)
        return 'error';
    return $affected > 0 ? 'inserted' : 'duplicate';
}

function upgrade_legacy_tax_email_attachment_identity($mysqli, $row)
{
    $stmt = $mysqli->prepare(
        'SELECT id
         FROM fnd_tax_email_queue_tab
         WHERE gmail_message_id = ?
           AND gmail_attachment_id = ?
           AND attachment_name = ?
           AND gmail_part_id LIKE "legacy-%"
           AND valid = 1
         ORDER BY id DESC
         LIMIT 1'
    );
    if (!$stmt)
        return false;
    $stmt->bind_param('sss', $row['gmail_message_id'], $row['gmail_attachment_id'], $row['attachment_name']);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();
    $id = (int) ($rows[0]['id'] ?? 0);
    if ($id <= 0)
        return false;

    $update = $mysqli->prepare(
        'UPDATE fnd_tax_email_queue_tab
         SET email_message_id = ?, gmail_part_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );
    if (!$update)
        return false;
    $update->bind_param('isi', $row['email_message_id'], $row['gmail_part_id'], $id);
    $ok = $update->execute();
    $update->close();
    return (bool) $ok;
}

function tax_header_value($headers, $name)
{
    foreach ($headers as $header) {
        if (strcasecmp((string) ($header['name'] ?? ''), $name) === 0) {
            return (string) ($header['value'] ?? '');
        }
    }
    return '';
}

function tax_collect_gmail_text($part)
{
    $text = '';
    $mime = (string) ($part['mimeType'] ?? '');
    $data = (string) ($part['body']['data'] ?? '');
    if (($mime === 'text/plain' || $mime === 'text/html') && $data !== '') {
        $decoded = base64_decode(strtr($data, '-_', '+/'));
        $text .= ' ' . strip_tags((string) $decoded);
    }
    foreach (($part['parts'] ?? []) as $child) {
        $text .= ' ' . tax_collect_gmail_text($child);
    }
    return trim(preg_replace('/\s+/', ' ', $text));
}

function tax_collect_gmail_html($part)
{
    $html = '';
    $mime = (string) ($part['mimeType'] ?? '');
    $data = (string) ($part['body']['data'] ?? '');
    if ($mime === 'text/html' && $data !== '') {
        $decoded = base64_decode(strtr($data, '-_', '+/'));
        if ($decoded !== false)
            $html .= (string) $decoded;
    }
    foreach (($part['parts'] ?? []) as $child) {
        $html .= tax_collect_gmail_html($child);
    }
    return trim($html);
}

function tax_collect_gmail_attachments($part, $path = '0')
{
    $items = [];
    $filename = (string) ($part['filename'] ?? '');
    $mimeType = (string) ($part['mimeType'] ?? '');
    if ($filename !== '' && tax_is_invoice_attachment($filename, $mimeType)) {
        $items[] = [
            'filename' => $filename,
            'mimeType' => $mimeType,
            'partId' => (string) ($part['partId'] ?? $path),
            'attachmentId' => (string) ($part['body']['attachmentId'] ?? ''),
            'data' => (string) ($part['body']['data'] ?? ''),
        ];
        return $items;
    }
    foreach (($part['parts'] ?? []) as $index => $child) {
        $child_path = ((string) ($part['partId'] ?? $path)) . '.' . $index;
        $items = array_merge($items, tax_collect_gmail_attachments($child, $child_path));
    }
    $unique = [];
    foreach ($items as $item) {
        $key = (string) $item['partId'] . '|' . strtolower((string) $item['filename']) . '|' . (string) $item['attachmentId'] . '|' . substr((string) $item['data'], 0, 24);
        $unique[$key] = $item;
    }
    return array_values($unique);
}

function tax_match_category_rule($mysqli, $type, $text, $fallback)
{
    $haystack = strtolower((string) $text);
    if ($haystack === '')
        return $fallback;

    $stmt = $mysqli->prepare(
        'SELECT name, rule_keywords
         FROM fnd_tax_categories_tab
         WHERE valid = 1
           AND type = ?
           AND rule_keywords IS NOT NULL
           AND rule_keywords <> ""
         ORDER BY id ASC'
    );
    if (!$stmt)
        return $fallback;
    $stmt->bind_param('s', $type);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $keywords = preg_split('/[,\\n]+/', (string) ($row['rule_keywords'] ?? ''));
        foreach ($keywords as $keyword) {
            $keyword = strtolower(trim($keyword));
            if ($keyword !== '' && strpos($haystack, $keyword) !== false) {
                return (string) $row['name'];
            }
        }
    }

    return $fallback;
}

function tax_match_subcategory_rule($mysqli, $type, $category, $text)
{
    $haystack = strtolower((string) $text);
    if ($haystack === '')
        return '';

    $stmt = $mysqli->prepare(
        'SELECT s.name, s.rule_keywords
         FROM fnd_tax_subcategories_tab s
         JOIN fnd_tax_categories_tab c ON c.id = s.category_id
         WHERE s.valid = 1
           AND c.valid = 1
           AND c.type = ?
           AND c.name = ?
           AND s.rule_keywords IS NOT NULL
           AND s.rule_keywords <> ""
         ORDER BY s.id ASC'
    );
    if (!$stmt)
        return '';
    $stmt->bind_param('ss', $type, $category);
    $stmt->execute();
    $rows = get_result($stmt);
    $stmt->close();

    foreach ($rows as $row) {
        $keywords = preg_split('/[,\\n]+/', (string) ($row['rule_keywords'] ?? ''));
        foreach ($keywords as $keyword) {
            $keyword = strtolower(trim($keyword));
            if ($keyword !== '' && strpos($haystack, $keyword) !== false) {
                return (string) $row['name'];
            }
        }
    }

    return '';
}

function tax_extract_attachment_text($access_token, $message_id, $attachment)
{
    $mime = strtolower((string) ($attachment['mimeType'] ?? ''));
    $filename = strtolower((string) ($attachment['filename'] ?? ''));
    $is_text_like = strpos($mime, 'text/') === 0
        || $mime === 'message/rfc822'
        || substr($filename, -4) === '.eml'
        || substr($filename, -4) === '.csv';
    if (!$is_text_like)
        return '';

    $data = (string) ($attachment['data'] ?? '');
    $attachment_id = (string) ($attachment['attachmentId'] ?? '');
    if ($data === '' && $access_token !== '' && $message_id !== '' && $attachment_id !== '') {
        $response = tax_gmail_api_get($access_token, tax_removed_gmail_endpoint());
        $data = (string) ($response['data'] ?? '');
    }
    if ($data === '')
        return '';

    $decoded = base64_decode(strtr($data, '-_', '+/'));
    if ($decoded === false)
        return '';
    $decoded = (string) $decoded;
    if ($mime === 'message/rfc822' || substr($filename, -4) === '.eml') {
        return tax_extract_eml_text($decoded);
    }
    return trim(strip_tags(tax_decode_quoted_printable($decoded)));
}

function tax_decode_quoted_printable($value)
{
    return quoted_printable_decode((string) $value);
}

function tax_extract_eml_text($raw)
{
    $parts = tax_collect_mime_parts((string) $raw);
    $text = '';
    foreach ($parts as $part) {
        $headers = tax_unfold_headers($part['headers']);
        if (preg_match('/content-type:\s*text\/(html|plain)/i', $headers)) {
            $text .= "\n" . tax_decode_mime_part_body($headers, $part['body']);
        }
    }
    if (trim($text) === '') {
        $pieces = preg_split("/\r?\n\r?\n/", (string) $raw, 2);
        $text = $pieces[1] ?? $raw;
    }
    return trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function tax_count_eml_invoice_attachments($raw)
{
    if (trim((string) $raw) === '')
        return 1;
    $count = 0;
    $parts = tax_collect_mime_parts((string) $raw);
    foreach ($parts as $part) {
        $headers = tax_unfold_headers($part['headers']);
        if (preg_match('/content-disposition:\s*attachment/i', $headers) || preg_match('/filename\*?=/i', $headers)) {
            if (!preg_match('/content-type:\s*message\/rfc822/i', $headers))
                $count++;
        }
    }
    return max(1, $count);
}

function tax_collect_mime_parts($raw)
{
    $split = tax_split_mime_header_body((string) $raw);
    $headers = tax_unfold_headers($split['headers']);
    $boundary = tax_mime_boundary($headers);
    if ($boundary === '')
        return [$split];

    $items = [];
    $segments = explode('--' . $boundary, $split['body']);
    foreach ($segments as $segment) {
        $segment = trim($segment);
        if ($segment === '' || $segment === '--')
            continue;
        $part = tax_split_mime_header_body($segment);
        $partHeaders = tax_unfold_headers($part['headers']);
        if (preg_match('/content-type:\s*multipart\//i', $partHeaders)) {
            $items = array_merge($items, tax_collect_mime_parts($part['headers'] . "\r\n\r\n" . $part['body']));
        } else {
            $items[] = $part;
        }
    }
    return $items;
}

function tax_split_mime_header_body($raw)
{
    if (preg_match("/\r?\n\r?\n/", $raw, $match, PREG_OFFSET_CAPTURE)) {
        $pos = $match[0][1];
        return [
            'headers' => substr($raw, 0, $pos),
            'body' => substr($raw, $pos + strlen($match[0][0])),
        ];
    }
    return ['headers' => '', 'body' => $raw];
}

function tax_unfold_headers($headers)
{
    return preg_replace("/\r?\n[ \t]+/", ' ', (string) $headers);
}

function tax_mime_boundary($headers)
{
    if (preg_match('/boundary="?([^";\r\n]+)"?/i', (string) $headers, $m))
        return $m[1];
    return '';
}

function tax_decode_mime_part_body($headers, $body)
{
    $encoding = '';
    if (preg_match('/content-transfer-encoding:\s*([^\r\n]+)/i', (string) $headers, $m)) {
        $encoding = strtolower(trim($m[1]));
    }
    $body = trim((string) $body);
    if ($encoding === 'base64') {
        $decoded = base64_decode(preg_replace('/\s+/', '', $body));
        return $decoded === false ? $body : (string) $decoded;
    }
    if ($encoding === 'quoted-printable')
        return quoted_printable_decode($body);
    return $body;
}

function tax_is_invoice_attachment($filename, $mimeType)
{
    $lowerName = strtolower((string) $filename);
    $lowerMime = strtolower((string) $mimeType);
    return preg_match('/\.(pdf|png|jpg|jpeg|webp|csv|xls|xlsx|eml)$/i', $lowerName)
        || in_array($lowerMime, [
            'application/pdf',
            'text/csv',
            'message/rfc822',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ], true);
}

function tax_extract_amount($text)
{
    $text = html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/', ' ', $text);

    $priority_patterns = [
        '/(?:amount\s+paid|paid\s+amount|total\s+paid|grand\s+total|invoice\s+total|receipt\s+total|total\s+amount|amount\s+due|balance\s+due|subtotal)\s*[:\-\s]*(?:inc\.?\s*tax)?\s*(?:LKR|Rs\.?|USD|\$)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i',
        '/(?<![A-Z0-9-])(?:LKR|Rs\.?|USD|\$)\s+([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:inc\.?\s*tax)?\s*(?:amount\s+paid|paid|total|due)?/i',
    ];
    foreach ($priority_patterns as $pattern) {
        if (preg_match_all($pattern, $text, $matches) && !empty($matches[1])) {
            $values = array_map(function ($value) {
                return (float) str_replace(',', '', $value); }, $matches[1]);
            $values = array_values(array_filter($values, function ($value) {
                return $value > 0; }));
            if (count($values) > 0)
                return max($values);
        }
    }

    $all = [];
    if (preg_match_all('/(?<![A-Z0-9-])(?:LKR|Rs\.?|USD|\$)\s+([0-9][0-9,]*(?:\.\d{1,2})?)/i', $text, $matches) && !empty($matches[1])) {
        foreach ($matches[1] as $value)
            $all[] = (float) str_replace(',', '', $value);
    }
    if (preg_match_all('/([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:LKR|USD)/i', $text, $matches) && !empty($matches[1])) {
        foreach ($matches[1] as $value)
            $all[] = (float) str_replace(',', '', $value);
    }
    $all = array_values(array_filter($all, function ($value) {
        return $value > 0; }));
    return count($all) > 0 ? max($all) : 0.0;
}

function tax_extract_currency($text)
{
    return preg_match('/USD|\$/i', $text) ? 'USD' : 'LKR';
}

function tax_extract_vendor($from, $subject)
{
    if (preg_match('/^"?([^"<]+)"?\s*</', $from, $m))
        return trim($m[1]);
    return trim(explode('-', $subject)[0] ?? $subject);
}

function tax_extract_invoice_no($text)
{
    $text = html_entity_decode(strip_tags((string) $text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/\s+/', ' ', $text);

    $patterns = [
        '/\b(?:invoice|inv|receipt)\s*(?:number|no\.?|#|id)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i',
        '/\b(?:invoice|inv|receipt)\s+(?:is\s+available\s+for|available\s+for)\s+([A-Z0-9][A-Z0-9-]{3,})\b/i',
        '/\b([0-9]{6,})\.(?:pdf|csv|xls|xlsx|png|jpe?g|webp)\b/i',
    ];

    foreach ($patterns as $pattern) {
        if (preg_match_all($pattern, $text, $matches) && !empty($matches[1])) {
            foreach ($matches[1] as $candidate) {
                $candidate = strtoupper(trim($candidate));
                if (tax_is_valid_invoice_token($candidate))
                    return $candidate;
            }
        }
    }
    return '';
}

function tax_is_valid_invoice_token($value)
{
    $value = strtoupper(trim((string) $value));
    if ($value === '')
        return false;
    if (in_array($value, ['NUMBER', 'NO', 'ID', 'AVAILABLE', 'RECEIPT', 'INVOICE'], true))
        return false;
    if (!preg_match('/\d/', $value))
        return false;
    return preg_match('/^[A-Z0-9-]{4,}$/', $value) === 1;
}

function tax_extract_invoice_date($text)
{
    if (preg_match('/(\d{4}-\d{2}-\d{2})/', $text, $m))
        return $m[1];
    if (preg_match('/(\d{1,2}\/\d{1,2}\/\d{4})/', $text, $m))
        return date('Y-m-d', strtotime($m[1]));
    return null;
}

function tax_extract_tax_amount($text)
{
    if (preg_match('/(?:VAT|Tax)\s*(?:Amount)?\s*[:.-]?\s*(?:LKR|Rs\.?|\$|USD)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i', $text, $m)) {
        return (float) str_replace(',', '', $m[1]);
    }
    return null;
}
