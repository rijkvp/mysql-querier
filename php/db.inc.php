<?php
// Show errors for debugging
ini_set("display_errors", 1);
ini_set("display_startup_errors", 1);
error_reporting(E_ALL);
// Allow more memory for bigger databases
// TODO: Limit database queries to avoid loading whole database in memory
ini_set("memory_limit", "8192M");

// Database connections
$rootDbConn = new mysqli("localhost", "root");
$readDbConn = new mysqli("localhost", "read");
 