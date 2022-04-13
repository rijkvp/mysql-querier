<?php
include "db.inc.php";

if (!isset($_GET["db"])) {
    http_response_code(400);
    die("No database specified.");
}
$dbName = $_GET["db"];

if (!isset($_GET["query"])) {
    http_response_code(400);
    die("No query specified.");
}
$query = $_GET["query"];

if (!isset($_GET["format"])) {
    http_response_code(400);
    die("No format specified.");
}
$format = $_GET["format"];

if (!$readDbConn->query("USE " . $dbName)) {
    http_response_code(500);
    die("Failed to open database: " . $readDbConn->error);
}

if (!$result = $readDbConn->query($query)) {
    http_response_code(500);
    die("Query failed: " . $readDbConn->error);
}

$columnNames = [];
foreach (mysqli_fetch_fields($result) as $field) {
    $columnNames[] = $field->name;
}

// Comma Seperated File (CSV)
if ($format == "csv") {
    $csv = "";
    foreach ($columnNames as $col) {
        $csv .= $col;
        $csv .= ", ";
    }
    $csv .= "\n";
    foreach ($result as $row) {
        foreach (array_values($row) as $col) {
            $csv .= $col;
            $csv .= ", ";
        }
        $csv .= "\n";
    }
    header("Content-Type: text/csv");
    echo $csv;
}
// JavaScript Object Notation (JSON)
else if ($format == "json") {
    $json = [];
    foreach ($result as $row) {
        $json[] = $row;
    }
    header("Content-Type: application/json");
    echo json_encode($json);
} else {
    http_response_code(500);
    die("Unrecognized format.");
}
