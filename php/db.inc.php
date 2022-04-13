<?php
// Show errors for debugging
ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);
mysqli_report(MYSQLI_REPORT_ERROR);

// Database connections
$rootDbConn = new mysqli("localhost", "root");
$readDbConn = new mysqli("localhost", "read");
 