const express = require('express')
const mysql = require('mysql2/promise');
const cp = require("child_process");

// Server settings 
const hostname = '127.0.0.1';
const port = 1700;

async function main() {
    const app = express();

    // MySQL connections
    const rootDbConn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        rowsAsArray: true,
        dateStrings: true
    });
    const readDbConn = await mysql.createConnection({
        host: 'localhost',
        user: 'read',
        rowsAsArray: true,
        dateStrings: true
    });

    // Serve static files from the public folder
    app.use(express.static('.'))

    // Use JSON format
    app.use(express.json());

    // databases: receive a list of the databases
    app.get('/php/databases.php', async (_, res) => {
        const [rows] = await rootDbConn.query('SHOW databases');
        // Hide default MySQL databases.
        const databases = rows.filter(i => i != 'information_schema' && i != 'performance_schema' && i != 'mysql' && i != 'sys');
        res.json(databases);
    });

    // Layout: get the table columns and data types of the database
    app.get('/php/layout.php', async (req, res, next) => {
        // Select database
        const useResult = await rootDbConn.query(`USE ${req.query.db}`).catch(useErr => {
            res.status(404).send('Database not found!');
        });
        if (useResult == null) {
            next();
        } else {
            // Get table names
            const [tableRows] = await rootDbConn.query('SHOW tables');
            // Get column name and data type for each table
            var tableLayouts = [];
            for (let tableRow of tableRows) {
                const tableName = tableRow[0];
                const [rows] = await rootDbConn.query(
                    `SELECT COLUMN_NAME, DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = Database() AND TABLE_NAME = '${tableName}'
                `);
                tableLayouts.push({
                    name: tableName,
                    columns: rows,
                });
            };
            res.json(tableLayouts);
        }
    });

    // Run: execute a querry
    app.post('/php/run.php', async (req, res, next) => {
        let dbConn;
        if (!req.body.readOnly) {
            dbConn = rootDbConn;
        } else {
            dbConn = readDbConn;
        }

        // Select the database
        let useResult = await dbConn.query(`USE ${req.body.db}`).catch(useErr => {
            res.json({
                success: false,
                hasData: false,
                error: useErr.message,
            });
        });
        // Execute the query
        if (useResult == null) {
            next();
        } else {
            dbConn.query(req.body.query)
                .catch(queryErr => {
                    // Send failed query result
                    res.json({
                        success: false,
                        hasData: false,
                        error: queryErr.message,
                    });
                })
                .then(result => {
                    if (result == null) {
                        next();
                    }
                    // Query result without data
                    else if (!Array.isArray(result[0]) || !Array.isArray(result[1])) {
                        res.json({
                            success: true,
                            hasData: false,
                        });
                    }
                    else {
                        const [rows, fields] = result;
                        // Extract the column names from the query result
                        var columnNames = [];
                        fields.forEach(f => {
                            columnNames.push(f.name);
                        });
                        // Calculate pagination
                        const pageSize = parseInt(req.body.pageSize);
                        const page = parseInt(req.body.page);
                        const count = rows.length;
                        const pageCount = parseInt(Math.ceil(count / pageSize));
                        const from = page * pageSize;
                        const to = Math.min(page * pageSize + pageSize, count);
                        const data = rows.slice(from, to);
                        // Send result
                        res.json({
                            success: true,
                            hasData: true,
                            count: count,
                            pageCount: pageCount,
                            from: from,
                            to: to,
                            headers: columnNames,
                            data: data,
                        });
                    }
                });
        }
    });

    // Reset: executes the database reset script
    // TODO: Add reset function back
    // app.post('/php/reset.php', async (req, res) => {
    //     cp.exec('cd .. && ./scripts/reset_dbs.sh', (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Error during reset: ${error}`);
    //             res.status(500).send();
    //         }
    //         if (stderr) {
    //             console.error(`Error during reset (STERR): ${stderr}`);
    //             res.status(500).send();
    //         }
    //         res.send();
    //     });
    // });

    // Export: exports a query result to a file
    app.get('/php/export.php', async (req, res, next) => {
        // Select database
        let useResult = await readDbConn.query(`USE ${req.query.db}`).catch(useErr => {
            res.status(404).send('Database not found!');
        });

        // Execute the query
        if (useResult == null) {
            next();
        }
        else {
            readDbConn.query(req.query.query).catch(queryErr => {
                res.status(400).send('Invalid query!');
            }).then(result => {
                if (result == null) {
                    next();
                }
                else if (!Array.isArray(result[0]) || !Array.isArray(result[1])) {
                    res.status(400).send('Query without data.');
                }
                else {
                    const [rows, fields] = result;
                    // Extract the column names from the query result
                    var columnNames = [];
                    fields.forEach(c => {
                        columnNames.push(c.name);
                    });

                    switch (req.query.format.toLowerCase()) {
                        // Comma Seperated File
                        case 'csv':
                            var file = '';
                            columnNames.forEach(col => {
                                file += col;
                                file += ',';
                            });
                            file += '\n';
                            rows.forEach(row => {
                                row.forEach(col => {
                                    file += col;
                                    file += ';';
                                });
                                file += '\n';
                            });
                            res.set('Content-Type', 'text/csv').send(file);
                            break;
                        // JavaScript Object Natation
                        case 'json':
                            var jsonList = [];
                            for (let row of rows) {
                                var item = {};
                                for (let n in columnNames) {
                                    item[columnNames[n]] = row[n];
                                }
                                jsonList.push(item);
                            }
                            const jsonFile = JSON.stringify(jsonList, null, 4);
                            res.set('Content-Type', 'application/json').send(jsonFile);
                            break;
                        default:
                            res.status(404).send('Unkown file format!');
                            break;
                    }
                }
            });
        }
    });

    // Start the server
    app.listen(port, hostname, () => {
        console.log(`Querier gestart op ${hostname}:${port}`)
        console.log(`Druk op de volgende link om te openen: http://${hostname}:${port} (als hij niet automatisch opent)`)
    });
}

main();
