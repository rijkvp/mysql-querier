<?php

include "db.inc.php";

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, false);

$dbConn;
if ($input->readOnly) {
    $dbConn = $readDbConn;
} else {
    $dbConn = $rootDbConn;
}

if (!isset($input->db)) {
    http_response_code(404);
    die("No database selected");
}

if (!$dbConn->query("USE " . $input->db)) {
    http_response_code(500);
    die($dbConn->error);
}

header("Content-Type: application/json");

if (!$result = $dbConn->query($input->query)) {
    $error = array();
    $error["success"] = false;
    $error["hasData"] = false;
    $error["error"] = $dbConn->error;
    echo json_encode($error);
} else {
    $columnNames = [];
    foreach (mysqli_fetch_fields($result) as $field) {
        $columnNames[] = $field->name;
    }
    $pageSize = (int) $input->pageSize;
    $page = (int) $input->page;
    $count = $result->num_rows;
    $pageCount = (int) ceil($count / $pageSize);
    $from = $page * $pageSize;
    $to = min($page * $pageSize + $pageSize, $count);

    $rows = [];
    $counter = 0;
    while ($row = $result->fetch_row()) {
        if ($counter >= $from && $counter <= $to) {
            $rows[] = array_values($row);
        }
        $counter++;
    }

    $output = (object)[];
    $output->success = true;
    $output->hasData = true;
    $output->count = $count;
    $output->pageCount = $pageCount;
    $output->from = $from;
    $output->to = $to;
    $output->headers = $columnNames;
    $output->data = $rows;
    echo json_encode($output);
}
