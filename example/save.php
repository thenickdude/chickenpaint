<?php

function chibi_die($message) {
	die("CHIBIERROR $message");
}

if (!isset ($_FILES["picture"]) || $_FILES['picture']['error'] != UPLOAD_ERR_OK
		|| isset($_FILES['chibifile']) && $_FILES['chibifile']['error'] != UPLOAD_ERR_OK) {
	chibi_die("Your picture upload failed! Please try again!");
}

header('Content-type: text/plain');

$rotation = isset($_POST['rotation']) && ((int) $_POST['rotation']) > 0 ? ((int) $_POST['rotation']) : 0;

$success = TRUE;

$success = $success && move_uploaded_file($_FILES['picture']['tmp_name'], 'uploaded.png');

if (isset($_FILES["chibifile"])) {
	$success = $success && move_uploaded_file($_FILES['chibifile']['tmp_name'], 'uploaded.chi');
}

if (isset($_FILES['swatches'])) {
    $success = $success && move_uploaded_file($_FILES['swatches']['tmp_name'], 'uploaded.aco');
}

if (!$success) {
    chibi_die("Couldn't move uploaded files");
}

die("CHIBIOK\n");
