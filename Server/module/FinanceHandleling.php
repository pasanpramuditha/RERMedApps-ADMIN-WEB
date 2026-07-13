<?php

/**
 * Finance admin API handlers.
 *
 * Other income records are stored in MySQL so the admin panel does not depend
 * on Firebase/Firestore for this finance workflow.
 */

if ($tag === 'GET_OTHER_INCOMES') {
    handle_get_other_incomes($main_mysqli);
}

if ($tag === 'GET_CURRENCY_RATES') {
    handle_get_currency_rates($main_mysqli);
}

if ($tag === 'SAVE_OTHER_INCOME') {
    handle_save_other_income($main_mysqli);
}

if ($tag === 'DELETE_OTHER_INCOME') {
    handle_delete_other_income($main_mysqli);
}

if ($tag === 'LIST_OTHER_INCOME_CATEGORIES') {
    handle_list_other_income_categories($main_mysqli);
}

if ($tag === 'RENAME_OTHER_INCOME_CATEGORY') {
    handle_rename_other_income_category($main_mysqli);
}

if ($tag === 'DELETE_OTHER_INCOME_CATEGORY') {
    handle_delete_other_income_category($main_mysqli);
}

if ($tag === 'UPLOAD_FINANCE_ATTACHMENT') {
    handle_upload_finance_attachment($main_mysqli);
}

if ($tag === 'GET_FINANCE_FIXED_DEPOSITS') {
    handle_get_finance_fixed_deposits($main_mysqli);
}

if ($tag === 'SAVE_FINANCE_FIXED_DEPOSIT') {
    handle_save_finance_fixed_deposit($main_mysqli);
}

if ($tag === 'DELETE_FINANCE_FIXED_DEPOSIT') {
    handle_delete_finance_fixed_deposit($main_mysqli);
}

if ($tag === 'GET_FINANCE_PAYOUTS') {
    handle_get_finance_payouts($main_mysqli);
}

if ($tag === 'SAVE_FINANCE_PAYOUT') {
    handle_save_finance_payout($main_mysqli);
}

if ($tag === 'DELETE_FINANCE_PAYOUT') {
    handle_delete_finance_payout($main_mysqli);
}

if ($tag === 'GET_FINANCE_EXPENSES') {
    handle_get_finance_expenses($main_mysqli);
}

if ($tag === 'SAVE_FINANCE_EXPENSE') {
    handle_save_finance_expense($main_mysqli);
}

if ($tag === 'DELETE_FINANCE_EXPENSE') {
    handle_delete_finance_expense($main_mysqli);
}

if ($tag === 'SEND_FINANCE_INVOICE') {
    handle_send_finance_invoice($main_mysqli);
}

function handle_get_other_incomes($mysqli) {
    try {
        $stmt = $mysqli->prepare(
            'SELECT id, category, description, amount, currency, income_date, attachment_url, converted_amount, valid, created_at, updated_at
             FROM fnd_other_income_tab
             WHERE valid = 1
             ORDER BY income_date DESC, id DESC'
        );

        if (!$stmt || !$stmt->execute()) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load other income records'], 500);
        }

        $rows = get_result($stmt);
        $stmt->close();

        send_json([
            'success' => true,
            'incomes' => array_map('map_other_income_row', $rows)
        ]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to load other income records: ' . $error->getMessage()], 500);
    }
}

function handle_get_currency_rates($mysqli) {
    try {
        $stmt = $mysqli->prepare(
            'SELECT base_currency, currency_code, rate, time_last_update_utc, time_next_update_utc
             FROM currency_rates
             WHERE base_currency = ?
             ORDER BY currency_code ASC'
        );

        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }

        $base = 'USD';
        $stmt->bind_param('s', $base);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            send_json(['success' => false, 'error_msg' => $error], 500);
        }

        $rows = get_result($stmt);
        $stmt->close();

        $rates = [];
        foreach ($rows as $row) {
            $code = strtoupper((string)($row['currency_code'] ?? ''));
            if ($code !== '') {
                $rates[$code] = (float)($row['rate'] ?? 0);
            }
        }

        if (!isset($rates['USD'])) {
            $rates['USD'] = 1.0;
        }

        send_json([
            'success' => true,
            'base_currency' => 'USD',
            'rates' => $rates,
            'row_count' => count($rates)
        ]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to load currency rates: ' . $error->getMessage()], 500);
    }
}

function handle_save_other_income($mysqli) {
    try {
        $id = (int)($_POST['id'] ?? 0);
        $category = trim((string)($_POST['category'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));
        $amount = (float)($_POST['amount'] ?? 0);
        $currency = strtoupper(trim((string)($_POST['currency'] ?? 'USD')));
        $income_date = substr((string)($_POST['date'] ?? ''), 0, 10);
        $attachment_url = trim((string)($_POST['attachment_url'] ?? ''));
        $converted_amount = isset($_POST['converted_amount']) && $_POST['converted_amount'] !== ''
            ? (float)$_POST['converted_amount']
            : null;

        if ($category === '' || $description === '' || $amount <= 0 || !in_array($currency, ['USD', 'LKR'], true) || $income_date === '') {
            send_json(['success' => false, 'error_msg' => 'Required income fields are missing or invalid'], 400);
        }

        if ($id > 0) {
            $stmt = $mysqli->prepare(
                'UPDATE fnd_other_income_tab
                 SET category = ?, description = ?, amount = ?, currency = ?, income_date = ?, attachment_url = ?, converted_amount = ?, valid = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?'
            );
            if (!$stmt) {
                send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
            }
            $stmt->bind_param('ssdsssdi', $category, $description, $amount, $currency, $income_date, $attachment_url, $converted_amount, $id);
        } else {
            $stmt = $mysqli->prepare(
                'INSERT INTO fnd_other_income_tab
                    (category, description, amount, currency, income_date, attachment_url, converted_amount, valid)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
            );
            if (!$stmt) {
                send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
            }
            $stmt->bind_param('ssdsssd', $category, $description, $amount, $currency, $income_date, $attachment_url, $converted_amount);
        }

        if (!$stmt->execute()) {
            $error = $stmt->error ?: $mysqli->error;
            $stmt->close();
            send_json(['success' => false, 'error_msg' => $error], 500);
        }

        $saved_id = $id > 0 ? $id : $mysqli->insert_id;
        $stmt->close();

        send_json([
            'success' => true,
            'income' => get_other_income_by_id($mysqli, $saved_id)
        ]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to save other income: ' . $error->getMessage()], 500);
    }
}

function handle_delete_other_income($mysqli) {
    try {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            send_json(['success' => false, 'error_msg' => 'Income id is required'], 400);
        }

        $existing = get_other_income_by_id($mysqli, $id);
        if (!$existing) {
            send_json(['success' => false, 'error_msg' => 'Income record not found'], 404);
        }

        $stmt = $mysqli->prepare('UPDATE fnd_other_income_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }

        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();

        send_json($ok ? ['success' => true, 'income' => $existing] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to delete other income: ' . $error->getMessage()], 500);
    }
}

function handle_list_other_income_categories($mysqli) {
    try {
        $stmt = $mysqli->prepare(
            'SELECT DISTINCT category
             FROM fnd_other_income_tab
             WHERE valid = 1 AND category IS NOT NULL AND TRIM(category) <> \'\'
             ORDER BY category ASC'
        );

        if (!$stmt || !$stmt->execute()) {
            send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load categories'], 500);
        }

        $rows = get_result($stmt);
        $stmt->close();

        $categories = array_map(function ($row) {
            return (string)$row['category'];
        }, $rows);

        send_json(['success' => true, 'categories' => $categories]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to load categories: ' . $error->getMessage()], 500);
    }
}

function handle_rename_other_income_category($mysqli) {
    try {
        $old_name = trim((string)($_POST['old_name'] ?? ''));
        $new_name = trim((string)($_POST['new_name'] ?? ''));

        if ($old_name === '' || $new_name === '') {
            send_json(['success' => false, 'error_msg' => 'Both old and new category names are required'], 400);
        }

        $stmt = $mysqli->prepare('UPDATE fnd_other_income_tab SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE category = ? AND valid = 1');
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }

        $stmt->bind_param('ss', $new_name, $old_name);
        $ok = $stmt->execute();
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();

        send_json($ok ? ['success' => true] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to rename category: ' . $error->getMessage()], 500);
    }
}

function handle_delete_other_income_category($mysqli) {
    try {
        $category = trim((string)($_POST['category'] ?? ''));
        if ($category === '') {
            send_json(['success' => false, 'error_msg' => 'Category name is required'], 400);
        }

        $stmt = $mysqli->prepare('SELECT COUNT(*) AS total FROM fnd_other_income_tab WHERE category = ? AND valid = 1');
        if (!$stmt) {
            send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        }

        $stmt->bind_param('s', $category);
        $stmt->execute();
        $rows = get_result($stmt);
        $stmt->close();

        $used_count = (int)($rows[0]['total'] ?? 0);
        if ($used_count > 0) {
            send_json(['success' => false, 'error_msg' => 'Cannot delete category: it is currently used by one or more income records.'], 400);
        }

        send_json(['success' => true]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to delete category: ' . $error->getMessage()], 500);
    }
}

function handle_upload_finance_attachment($mysqli) {
    try {
        $settings = function_exists('GetGlobalSettings') ? GetGlobalSettings($mysqli) : [];
        $upload_dir = rtrim((string)($settings['finance_upload_path'] ?? ''), '/');
        $public_url = rtrim((string)($settings['finance_upload_url'] ?? ''), '/');

        if ($upload_dir === '') {
            $upload_dir = dirname(__DIR__) . '/uploads/finance';
        }

        if ($public_url === '') {
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $public_url = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'admin.rermedapps.com') . '/web/1.0/uploads/finance';
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            send_json(['success' => false, 'error_msg' => 'Attachment file is required'], 400);
        }

        if (!is_dir($upload_dir) && !mkdir($upload_dir, 0755, true)) {
            send_json(['success' => false, 'error_msg' => 'Unable to create finance upload directory'], 500);
        }

        $original = $_FILES['file']['name'] ?? 'attachment';
        $tmp = $_FILES['file']['tmp_name'];
        $size = (int)($_FILES['file']['size'] ?? 0);
        if ($size <= 0 || $size > 10 * 1024 * 1024) {
            send_json(['success' => false, 'error_msg' => 'Attachment must be smaller than 10MB'], 400);
        }

        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $allowed_mimes = [
            'jpg' => ['image/jpeg'],
            'jpeg' => ['image/jpeg'],
            'png' => ['image/png'],
            'webp' => ['image/webp'],
            'gif' => ['image/gif'],
            'pdf' => ['application/pdf', 'application/x-pdf'],
        ];
        if (!isset($allowed_mimes[$extension])) {
            send_json(['success' => false, 'error_msg' => 'Only image and PDF attachments are allowed'], 400);
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? (string)finfo_file($finfo, $tmp) : '';
        if ($finfo) {
            finfo_close($finfo);
        }

        if (!in_array($mime, $allowed_mimes[$extension], true)) {
            send_json(['success' => false, 'error_msg' => 'Attachment content does not match the file type'], 400);
        }

        if ($extension === 'pdf') {
            $handle = fopen($tmp, 'rb');
            $signature = $handle ? fread($handle, 4) : '';
            if ($handle) {
                fclose($handle);
            }
            if ($signature !== '%PDF') {
                send_json(['success' => false, 'error_msg' => 'Invalid PDF attachment'], 400);
            }
        } elseif (getimagesize($tmp) === false) {
            send_json(['success' => false, 'error_msg' => 'Invalid image attachment'], 400);
        }

        $filename = 'finance_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $target = $upload_dir . '/' . $filename;

        if (!move_uploaded_file($tmp, $target)) {
            send_json(['success' => false, 'error_msg' => 'Failed to save uploaded attachment'], 500);
        }

        send_json([
            'success' => true,
            'url' => $public_url . '/' . $filename,
            'path' => $target,
            'file_name' => $original
        ]);
    } catch (Throwable $error) {
        send_json(['success' => false, 'error_msg' => 'Failed to upload finance attachment: ' . $error->getMessage()], 500);
    }
}

function get_other_income_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare(
        'SELECT id, category, description, amount, currency, income_date, attachment_url, converted_amount, valid, created_at, updated_at
         FROM fnd_other_income_tab
         WHERE id = ? AND valid = 1
         LIMIT 1'
    );

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }

    $rows = get_result($stmt);
    $stmt->close();

    return empty($rows) ? false : map_other_income_row($rows[0]);
}

function map_other_income_row($row) {
    return [
        'id' => (string)$row['id'],
        'category' => (string)$row['category'],
        'description' => (string)$row['description'],
        'amount' => (float)$row['amount'],
        'currency' => (string)($row['currency'] ?: 'USD'),
        'date' => (string)$row['income_date'],
        'attachmentUrl' => (string)($row['attachment_url'] ?? ''),
        'convertedAmount' => isset($row['converted_amount']) && $row['converted_amount'] !== null ? (float)$row['converted_amount'] : null,
    ];
}

function handle_get_finance_fixed_deposits($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT id, bank_entity, capital_asset, apy_percent, maturity_date, status, created_at, updated_at
         FROM fnd_finance_fixed_deposits_tab
         WHERE valid = 1
         ORDER BY maturity_date ASC, id DESC'
    );
    if (!$stmt || !$stmt->execute()) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load fixed deposits'], 500);
    }
    $rows = get_result($stmt);
    $stmt->close();
    send_json(['success' => true, 'fixed_deposits' => array_map('map_finance_fixed_deposit_row', $rows)]);
}

function handle_save_finance_fixed_deposit($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $bank_entity = trim((string)($_POST['bank_entity'] ?? ''));
    $capital_asset = trim((string)($_POST['capital_asset'] ?? ''));
    $apy_percent = (float)($_POST['apy_percent'] ?? 0);
    $maturity_date = substr((string)($_POST['maturity_date'] ?? ''), 0, 10);
    $status = trim((string)($_POST['status'] ?? 'Active'));

    if ($bank_entity === '' || $capital_asset === '' || $apy_percent <= 0 || $maturity_date === '' || !in_array($status, ['Active', 'Pending'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required fixed deposit fields are missing or invalid'], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'UPDATE fnd_finance_fixed_deposits_tab
             SET bank_entity = ?, capital_asset = ?, apy_percent = ?, maturity_date = ?, status = ?, valid = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('ssdssi', $bank_entity, $capital_asset, $apy_percent, $maturity_date, $status, $id);
    } else {
        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_finance_fixed_deposits_tab (bank_entity, capital_asset, apy_percent, maturity_date, status, valid)
             VALUES (?, ?, ?, ?, ?, 1)'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('ssdss', $bank_entity, $capital_asset, $apy_percent, $maturity_date, $status);
    }

    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }
    $saved_id = $id > 0 ? $id : $mysqli->insert_id;
    $stmt->close();
    send_json(['success' => true, 'fixed_deposit' => get_finance_fixed_deposit_by_id($mysqli, $saved_id)]);
}

function handle_delete_finance_fixed_deposit($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) send_json(['success' => false, 'error_msg' => 'Fixed deposit id is required'], 400);
    $existing = get_finance_fixed_deposit_by_id($mysqli, $id);
    if (!$existing) send_json(['success' => false, 'error_msg' => 'Fixed deposit not found'], 404);
    $stmt = $mysqli->prepare('UPDATE fnd_finance_fixed_deposits_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'fixed_deposit' => $existing] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_get_finance_payouts($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT id, payee_name, remarks, amount, currency, payout_date, payment_slip_url, transaction_type, created_at, updated_at
         FROM fnd_finance_payouts_tab
         WHERE valid = 1
         ORDER BY payout_date DESC, id DESC'
    );
    if (!$stmt || !$stmt->execute()) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load payouts'], 500);
    }
    $rows = get_result($stmt);
    $stmt->close();
    send_json(['success' => true, 'payouts' => array_map('map_finance_payout_row', $rows)]);
}

function handle_save_finance_payout($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $payee_name = trim((string)($_POST['payee_name'] ?? ''));
    $remarks = trim((string)($_POST['remarks'] ?? ''));
    $amount = (float)($_POST['amount'] ?? 0);
    $currency = strtoupper(trim((string)($_POST['currency'] ?? 'LKR')));
    $payout_date = substr((string)($_POST['date'] ?? ''), 0, 10);
    $payment_slip_url = trim((string)($_POST['payment_slip_url'] ?? ''));
    $transaction_type = trim((string)($_POST['transaction_type'] ?? 'Bank Transfer'));

    if ($payee_name === '' || $amount <= 0 || !in_array($currency, ['USD', 'LKR'], true) || $payout_date === '' || !in_array($transaction_type, ['Bank Transfer', 'Cash'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required payout fields are missing or invalid'], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'UPDATE fnd_finance_payouts_tab
             SET payee_name = ?, remarks = ?, amount = ?, currency = ?, payout_date = ?, payment_slip_url = ?, transaction_type = ?, valid = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('ssdssssi', $payee_name, $remarks, $amount, $currency, $payout_date, $payment_slip_url, $transaction_type, $id);
    } else {
        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_finance_payouts_tab (payee_name, remarks, amount, currency, payout_date, payment_slip_url, transaction_type, valid)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('ssdssss', $payee_name, $remarks, $amount, $currency, $payout_date, $payment_slip_url, $transaction_type);
    }
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }
    $saved_id = $id > 0 ? $id : $mysqli->insert_id;
    $stmt->close();
    send_json(['success' => true, 'payout' => get_finance_payout_by_id($mysqli, $saved_id)]);
}

function handle_delete_finance_payout($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) send_json(['success' => false, 'error_msg' => 'Payout id is required'], 400);
    $existing = get_finance_payout_by_id($mysqli, $id);
    if (!$existing) send_json(['success' => false, 'error_msg' => 'Payout not found'], 404);
    $stmt = $mysqli->prepare('UPDATE fnd_finance_payouts_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'payout' => $existing] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_get_finance_expenses($mysqli) {
    $stmt = $mysqli->prepare(
        'SELECT id, category, sub_category, description, amount, currency, expense_date, recurrence, attachment_url, converted_amount, is_generated, parent_id, created_at, updated_at
         FROM fnd_finance_expenses_tab
         WHERE valid = 1
         ORDER BY expense_date DESC, id DESC'
    );
    if (!$stmt || !$stmt->execute()) {
        send_json(['success' => false, 'error_msg' => $mysqli->error ?: 'Unable to load expenses'], 500);
    }
    $rows = get_result($stmt);
    $stmt->close();
    send_json(['success' => true, 'expenses' => array_map('map_finance_expense_row', $rows)]);
}

function handle_save_finance_expense($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    $category = trim((string)($_POST['category'] ?? ''));
    $sub_category = trim((string)($_POST['sub_category'] ?? ''));
    $description = trim((string)($_POST['description'] ?? ''));
    $amount = (float)($_POST['amount'] ?? 0);
    $currency = strtoupper(trim((string)($_POST['currency'] ?? 'USD')));
    $expense_date = substr((string)($_POST['date'] ?? ''), 0, 10);
    $recurrence = trim((string)($_POST['recurrence'] ?? 'One-Time'));
    $attachment_url = trim((string)($_POST['attachment_url'] ?? ''));
    $converted_amount = isset($_POST['converted_amount']) && $_POST['converted_amount'] !== '' ? (float)$_POST['converted_amount'] : null;

    if ($category === '' || $description === '' || $amount <= 0 || !in_array($currency, ['USD', 'LKR'], true) || $expense_date === '' || !in_array($recurrence, ['One-Time', 'Monthly', 'Annually'], true)) {
        send_json(['success' => false, 'error_msg' => 'Required expense fields are missing or invalid'], 400);
    }

    if ($id > 0) {
        $stmt = $mysqli->prepare(
            'UPDATE fnd_finance_expenses_tab
             SET category = ?, sub_category = ?, description = ?, amount = ?, currency = ?, expense_date = ?, recurrence = ?, attachment_url = ?, converted_amount = ?, valid = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sssdssssdi', $category, $sub_category, $description, $amount, $currency, $expense_date, $recurrence, $attachment_url, $converted_amount, $id);
    } else {
        $stmt = $mysqli->prepare(
            'INSERT INTO fnd_finance_expenses_tab (category, sub_category, description, amount, currency, expense_date, recurrence, attachment_url, converted_amount, is_generated, valid)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)'
        );
        if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
        $stmt->bind_param('sssdssssd', $category, $sub_category, $description, $amount, $currency, $expense_date, $recurrence, $attachment_url, $converted_amount);
    }
    if (!$stmt->execute()) {
        $error = $stmt->error ?: $mysqli->error;
        $stmt->close();
        send_json(['success' => false, 'error_msg' => $error], 500);
    }
    $saved_id = $id > 0 ? $id : $mysqli->insert_id;
    $stmt->close();
    send_json(['success' => true, 'expense' => get_finance_expense_by_id($mysqli, $saved_id)]);
}

function handle_delete_finance_expense($mysqli) {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) send_json(['success' => false, 'error_msg' => 'Expense id is required'], 400);
    $existing = get_finance_expense_by_id($mysqli, $id);
    if (!$existing) send_json(['success' => false, 'error_msg' => 'Expense not found'], 404);
    $stmt = $mysqli->prepare('UPDATE fnd_finance_expenses_tab SET valid = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    if (!$stmt) send_json(['success' => false, 'error_msg' => $mysqli->error], 500);
    $stmt->bind_param('i', $id);
    $ok = $stmt->execute();
    $error = $stmt->error ?: $mysqli->error;
    $stmt->close();
    send_json($ok ? ['success' => true, 'expense' => $existing] : ['success' => false, 'error_msg' => $error], $ok ? 200 : 500);
}

function handle_send_finance_invoice($mysqli) {
    $recipient = trim((string)($_POST['recipient'] ?? 'tax@rermedapps.com'));
    $subject = finance_clean_mail_header((string)($_POST['subject'] ?? 'RER MedApps Invoice'));
    $invoice_no = finance_clean_mail_header((string)($_POST['invoice_no'] ?? 'invoice'));
    $vendor_name = finance_clean_mail_header((string)($_POST['vendor_name'] ?? 'Vendor'));
    $invoice_date = finance_clean_mail_header((string)($_POST['invoice_date'] ?? date('Y-m-d')));
    $due_date = finance_clean_mail_header((string)($_POST['due_date'] ?? ''));
    $tag = finance_clean_mail_header((string)($_POST['tag'] ?? 'Expenses'));
    $remark = trim((string)($_POST['remark'] ?? ''));
    $currency = finance_clean_mail_header((string)($_POST['currency'] ?? 'LKR'));
    $total = (float)($_POST['invoice_total'] ?? 0);
    $lines = json_decode((string)($_POST['lines_json'] ?? '[]'), true);

    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        send_json(['success' => false, 'error_msg' => 'Invoice recipient email is invalid.'], 400);
    }
    if (strtolower($recipient) !== 'tax@rermedapps.com') {
        send_json(['success' => false, 'error_msg' => 'Invoice recipient must be tax@rermedapps.com.'], 400);
    }
    if ($subject === '' || $invoice_no === '' || $vendor_name === '' || !is_array($lines) || count($lines) === 0) {
        send_json(['success' => false, 'error_msg' => 'Invoice subject, vendor, number, and line items are required.'], 400);
    }

    $from = 'admin@rermedapps.com';
    $message_id = sprintf('<invoice-%s-%s@rermedapps.com>', preg_replace('/[^A-Za-z0-9_-]+/', '-', $invoice_no), bin2hex(random_bytes(6)));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: RER MedApps Admin <' . $from . '>',
        'Reply-To: ' . $from,
        'Message-ID: ' . $message_id,
        'X-RERMed-Invoice-No: ' . $invoice_no,
        'X-RERMed-Invoice-Vendor: ' . $vendor_name,
        'X-RERMed-Invoice-Total: ' . $currency . ' ' . number_format($total, 2, '.', ''),
    ];
    $invoice = [
        'invoice_no' => $invoice_no,
        'vendor_name' => $vendor_name,
        'invoice_date' => $invoice_date,
        'due_date' => $due_date,
        'tag' => $tag,
        'remark' => $remark,
        'currency' => $currency,
        'lines' => finance_normalize_invoice_lines($lines),
    ];
    $html = finance_build_invoice_html($invoice, $recipient);
    $text = finance_build_invoice_text($invoice, $recipient);

    $ok = @mail($recipient, $subject, $html, implode("\r\n", $headers));
    if (!$ok && trim($text) !== '') {
        $fallback_html = '<!doctype html><html><body><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">' . htmlspecialchars($text, ENT_QUOTES, 'UTF-8') . '</pre></body></html>';
        $ok = @mail($recipient, $subject, $fallback_html, implode("\r\n", $headers));
    }

    send_json($ok ? [
        'success' => true,
        'recipient' => $recipient,
        'message_id' => trim($message_id, '<>'),
        'total' => $total,
    ] : [
        'success' => false,
        'error_msg' => 'Server mail() failed while sending invoice to tax@rermedapps.com.',
    ], $ok ? 200 : 500);
}

function finance_clean_mail_header($value) {
    return trim(preg_replace('/[\r\n]+/', ' ', (string)$value));
}

function finance_normalize_invoice_lines($lines) {
    $clean = [];
    foreach ($lines as $line) {
        if (!is_array($line)) {
            continue;
        }
        $description = trim((string)($line['description'] ?? ''));
        $quantity = (float)($line['quantity'] ?? 0);
        $unit_price = (float)($line['unitPrice'] ?? $line['unit_price'] ?? 0);
        if ($description === '' || $quantity <= 0 || $unit_price < 0) {
            continue;
        }
        $clean[] = [
            'description' => $description,
            'quantity' => $quantity,
            'unit_price' => $unit_price,
        ];
    }
    return $clean;
}

function finance_invoice_money($amount, $currency) {
    $prefix = strtoupper((string)$currency) === 'LKR' ? 'Rs ' : '$';
    return $prefix . number_format((float)$amount, 2);
}

function finance_invoice_total($invoice) {
    $total = 0.0;
    foreach (($invoice['lines'] ?? []) as $line) {
        $total += (float)$line['quantity'] * (float)$line['unit_price'];
    }
    return $total;
}

function finance_build_invoice_html($invoice, $recipient) {
    $currency = strtoupper((string)($invoice['currency'] ?? 'LKR')) === 'USD' ? 'USD' : 'LKR';
    $tag = (string)($invoice['tag'] ?? 'Expenses');
    $accent = $tag === 'Expenses' ? '#f43f5e' : '#8b5cf6';
    $rows = '';
    foreach (($invoice['lines'] ?? []) as $index => $line) {
        $line_total = (float)$line['quantity'] * (float)$line['unit_price'];
        $rows .= '<tr>'
            . '<td style="padding:14px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">' . ($index + 1) . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">' . htmlspecialchars((string)$line['description'], ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">' . htmlspecialchars((string)$line['quantity'], ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">' . finance_invoice_money($line['unit_price'], $currency) . '</td>'
            . '<td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:800;">' . finance_invoice_money($line_total, $currency) . '</td>'
            . '</tr>';
    }
    $remark = trim((string)($invoice['remark'] ?? ''));
    $remark_html = $remark !== '' ? '<div style="margin-top:24px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;padding:18px;">'
        . '<div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Remark</div>'
        . '<div style="margin-top:8px;font-size:14px;line-height:1.6;color:#111827;">' . nl2br(htmlspecialchars($remark, ENT_QUOTES, 'UTF-8')) . '</div>'
        . '</div>' : '';
    $total = finance_invoice_total($invoice);

    return '<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:32px;font-family:Inter,Arial,sans-serif;color:#111827;">'
        . '<div style="max-width:820px;margin:0 auto;border-radius:30px;background:#ffffff;box-shadow:0 22px 70px rgba(15,23,42,0.16);overflow:hidden;">'
        . '<div style="background:#0d0d11;padding:34px 38px;color:#ffffff;"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;">'
        . '<div><div style="font-size:11px;font-weight:900;letter-spacing:0.22em;text-transform:uppercase;color:#34d399;">RER MedApps Finance</div>'
        . '<h1 style="margin:8px 0 0;font-size:34px;line-height:1;font-style:italic;letter-spacing:-0.04em;">Invoice</h1>'
        . '<div style="margin-top:14px;display:inline-block;border-radius:999px;background:' . $accent . ';padding:8px 13px;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">' . htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') . '</div></div>'
        . '<div style="text-align:right;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;">'
        . '<div style="font-weight:900;color:#ffffff;">' . htmlspecialchars((string)$invoice['invoice_no'], ENT_QUOTES, 'UTF-8') . '</div>'
        . '<div>Invoice date: ' . htmlspecialchars((string)$invoice['invoice_date'], ENT_QUOTES, 'UTF-8') . '</div>'
        . (trim((string)($invoice['due_date'] ?? '')) !== '' ? '<div>Due date: ' . htmlspecialchars((string)$invoice['due_date'], ENT_QUOTES, 'UTF-8') . '</div>' : '')
        . '</div></div></div>'
        . '<div style="padding:34px 38px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px;">'
        . '<div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;"><div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Vendor</div><div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">' . htmlspecialchars((string)$invoice['vendor_name'], ENT_QUOTES, 'UTF-8') . '</div></div>'
        . '<div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;"><div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Tax mailbox</div><div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">' . htmlspecialchars((string)$recipient, ENT_QUOTES, 'UTF-8') . '</div></div>'
        . '</div><table style="width:100%;border-collapse:collapse;"><thead><tr>'
        . '<th style="padding:0 0 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">#</th>'
        . '<th style="padding:0 12px 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Description</th>'
        . '<th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Qty</th>'
        . '<th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Rate</th>'
        . '<th style="padding:0 0 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Amount</th>'
        . '</tr></thead><tbody>' . $rows . '</tbody></table>'
        . '<div style="margin-top:28px;display:flex;justify-content:flex-end;"><div style="min-width:270px;border-radius:22px;background:#111827;color:#ffffff;padding:22px;">'
        . '<div style="display:flex;justify-content:space-between;color:rgba(255,255,255,0.62);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;"><span>Total</span><span>' . $currency . '</span></div>'
        . '<div style="margin-top:10px;text-align:right;font-size:30px;font-style:italic;font-weight:900;letter-spacing:-0.04em;color:#ffffff;">' . finance_invoice_money($total, $currency) . '</div>'
        . '</div></div>' . $remark_html . '</div></div></body></html>';
}

function finance_build_invoice_text($invoice, $recipient) {
    $currency = strtoupper((string)($invoice['currency'] ?? 'LKR')) === 'USD' ? 'USD' : 'LKR';
    $lines = [];
    foreach (($invoice['lines'] ?? []) as $index => $line) {
        $lines[] = ($index + 1) . '. ' . $line['description'] . ' - ' . $line['quantity'] . ' x ' . finance_invoice_money($line['unit_price'], $currency) . ' = ' . finance_invoice_money((float)$line['quantity'] * (float)$line['unit_price'], $currency);
    }
    return implode("\n", array_filter([
        'RER MedApps Finance Invoice',
        'Invoice No: ' . (string)$invoice['invoice_no'],
        'Vendor: ' . (string)$invoice['vendor_name'],
        'Tag: ' . (string)$invoice['tag'],
        'Invoice date: ' . (string)$invoice['invoice_date'],
        trim((string)($invoice['due_date'] ?? '')) !== '' ? 'Due date: ' . (string)$invoice['due_date'] : '',
        'Recipient: ' . (string)$recipient,
        '',
        implode("\n", $lines),
        '',
        'Total: ' . finance_invoice_money(finance_invoice_total($invoice), $currency),
        trim((string)($invoice['remark'] ?? '')) !== '' ? 'Remark: ' . (string)$invoice['remark'] : '',
    ]));
}

function get_finance_fixed_deposit_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare('SELECT id, bank_entity, capital_asset, apy_percent, maturity_date, status, created_at, updated_at FROM fnd_finance_fixed_deposits_tab WHERE id = ? AND valid = 1 LIMIT 1');
    if (!$stmt) return false;
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) { $stmt->close(); return false; }
    $rows = get_result($stmt);
    $stmt->close();
    return empty($rows) ? false : map_finance_fixed_deposit_row($rows[0]);
}

function get_finance_payout_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare('SELECT id, payee_name, remarks, amount, currency, payout_date, payment_slip_url, transaction_type, created_at, updated_at FROM fnd_finance_payouts_tab WHERE id = ? AND valid = 1 LIMIT 1');
    if (!$stmt) return false;
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) { $stmt->close(); return false; }
    $rows = get_result($stmt);
    $stmt->close();
    return empty($rows) ? false : map_finance_payout_row($rows[0]);
}

function get_finance_expense_by_id($mysqli, $id) {
    $stmt = $mysqli->prepare('SELECT id, category, sub_category, description, amount, currency, expense_date, recurrence, attachment_url, converted_amount, is_generated, parent_id, created_at, updated_at FROM fnd_finance_expenses_tab WHERE id = ? AND valid = 1 LIMIT 1');
    if (!$stmt) return false;
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) { $stmt->close(); return false; }
    $rows = get_result($stmt);
    $stmt->close();
    return empty($rows) ? false : map_finance_expense_row($rows[0]);
}

function map_finance_fixed_deposit_row($row) {
    return [
        'id' => (string)$row['id'],
        'bankEntity' => (string)$row['bank_entity'],
        'capitalAsset' => (string)$row['capital_asset'],
        'apyPercent' => (float)$row['apy_percent'],
        'maturityDate' => (string)$row['maturity_date'],
        'status' => (string)$row['status'],
    ];
}

function map_finance_payout_row($row) {
    return [
        'id' => (string)$row['id'],
        'employeeName' => (string)$row['payee_name'],
        'remarks' => (string)($row['remarks'] ?? ''),
        'amount' => (float)$row['amount'],
        'currency' => (string)($row['currency'] ?: 'LKR'),
        'date' => (string)$row['payout_date'],
        'paymentSlipUrl' => (string)($row['payment_slip_url'] ?? ''),
        'transactionType' => (string)($row['transaction_type'] ?? ''),
    ];
}

function map_finance_expense_row($row) {
    return [
        'id' => (string)$row['id'],
        'category' => (string)$row['category'],
        'subCategory' => (string)($row['sub_category'] ?? ''),
        'description' => (string)$row['description'],
        'amount' => (float)$row['amount'],
        'currency' => (string)($row['currency'] ?: 'USD'),
        'date' => (string)$row['expense_date'],
        'recurrence' => (string)($row['recurrence'] ?: 'One-Time'),
        'attachmentUrl' => (string)($row['attachment_url'] ?? ''),
        'convertedAmount' => isset($row['converted_amount']) && $row['converted_amount'] !== null ? (float)$row['converted_amount'] : null,
        'isGenerated' => ((int)($row['is_generated'] ?? 0)) === 1,
        'parentId' => isset($row['parent_id']) ? (string)$row['parent_id'] : '',
    ];
}
