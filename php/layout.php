<?php
include "db.inc.php";

if (isset($_GET["db"])) {
    if (!$rootDbConn->query("USE " . $_GET["db"])) {
        die($rootDbConn->error);
    }

    $result = $rootDbConn->query("SHOW tables");

    $layouts = array();

    foreach ($result as $row) {
        $tableName = array_values($row)[0];
        $layoutRow = array();
        if (!$columnResult = $rootDbConn->query(
            "SELECT COLUMN_NAME, DATA_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = Database() AND TABLE_NAME='" . $tableName . "'
            "
        )) {
            die("Failed to get layout " . $rootDbConn->error);
        }
        $columnNames = array();
        foreach ($columnResult as $columnRow) {
            $columnInfo = array();
            $columnInfo[0] = $columnRow["COLUMN_NAME"];
            $columnInfo[1] = $columnRow["DATA_TYPE"];
            $columnNames[] = $columnInfo;
        }
        $layoutRow['name'] = $tableName;
        $layoutRow['columns'] = $columnNames;
        $layouts[] = $layoutRow;
    }
    header("Content-Type", "application/json");
    echo json_encode($layouts);
} else {
    die("No database specified.");
}
