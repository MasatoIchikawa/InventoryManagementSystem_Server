// npm install express
// npm install mysql2
// npm run start-node

const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3001;
// const port = 3306;

app.use(express.json());

// const poolOption = {
//     connectionLimit : 1,
//     host: 'eanl4i1omny740jw.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
//     user: 'f4l8tyroombu7krp',
//     password: 'd0azhfyify5axnt4',
//     database: 'o9patnasz3100ghx',
//     timezone: 'jst'
// };

// var connection = mysql.createConnection(process.env.JAWSDB_URL);

// const connection = mysql.createConnection({
//     host: 'eanl4i1omny740jw.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
//     user: 'f4l8tyroombu7krp',
//     password: 'd0azhfyify5axnt4',
//     database: 'o9patnasz3100ghx'
// });

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'xeno1508',
  database: 'stock'
});

app.get('/', function(request, response){ 
  response.send ('Hello Worlds!\n'); 
});

app.get('/mstinventory', (req, res) => {
    const sql = `SELECT * FROM m_inventory
                 WHERE delete_at IS NULL
                 AND update_at IS NULL
                 ORDER BY display_no`;
    connection.query(sql, function (err, result, fields) {
        if (err) {
            connection.rollback(() => err);
            throw err;
        }
        res.status(200).json(result);
    });
});

app.get('/mstinventory/display', (req, res) => {
  const sql = `SELECT * FROM m_inventory
               WHERE delete_at IS NULL
               AND update_at IS NULL
               AND display_flag = 1
               ORDER BY display_no`;
  connection.query(sql, function (err, result, fields) {
      if (err) {
          connection.rollback(() => err);
          throw err;
      }
      res.status(200).json(result);
  });
});

app.get('/mstinventory_edit', (req, res) => {
    const sql = `SELECT * FROM m_inventory
                 WHERE inventory_id = ?`;
    connection.query(sql, [req.query.inventory_id],
        (error, result) => {
            if(error) {
                console.log(error)
            }
            else{
                res.status(200).json(result);
            }
        });
});

app.post('/mstinventory/insert', async (req, res, next) => {
  // (async () => {
  //   try {
  //     await mysqlPromise.beginTransaction(connection);
  //     const results = await mysqlPromise.query(connection, 'INSERT INTO posts (content) VALUES (?)', ['Hello!']);
  //     var log = 'Post ' + results.insertId + ' added';
  //     await mysqlPromise.query(connection, 'INSERT INTO logs (message) VALUES (?)', log);
  //     await mysqlPromise.commit(connection);
  //   } catch (err) {
  //     await mysqlPromise.rollback(connection, err);
  //   } finally {
  //     connection.end();
  //   }
  // })().catch((err) => {
  //   console.error(err);
  // });

    const pool = mysql.createPool(poolOption);
    const connection = await new Promise((resolve, reject) => {
        pool.getConnection((error, connection) => {
          if (error) reject(error)
          resolve(connection)
        })
      })

      try{
          await new Promise((resolve, reject) => {
            connection.beginTransaction((error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })

          if(req.body.inventory_id !== 0){
            await new Promise((resolve, reject) => {
              const update = `UPDATE m_inventory
                              SET update_at = NOW()
                              WHERE inventory_id = ?
                              AND update_at IS NULL`;

              const updateparam = [
                  req.body.inventory_id,
              ];
              connection.query(update, updateparam, (error, results) => {
                if (error) reject(error)
                resolve(results)
              })
            })
          }

          await new Promise((resolve, reject) => {
            const insert = `INSERT m_inventory(
                inventory_id,
                inventory_name,
                inventory_kana,
                tag, 
                jancode,
                skucode,
                unit,
                location,
                note,
                display_flag,
                display_no,
                insert_at,
                update_at,
                delete_at,
                insert_user_id)
                VALUES((SELECT IFNULL(max_id + 1, 1) from (SELECT max(inventory_id) AS max_id FROM m_inventory) AS temp), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL, ?)`;

            const insertparam = [
                req.body.inventory_name,
                req.body.inventory_kana,
                req.body.tag,
                req.body.jancode,
                req.body.skucode,
                req.body.unit,
                req.body.location,
                req.body.note,
                req.body.display_flag,
                req.body.display_no,
                req.body.insert_user_id
            ];
            
            connection.query(insert, insertparam, (error, results) => {
              if (error) {
                console.log(error);
                reject(error);
              }
              resolve(results)
            })
          })

          await new Promise((resolve, reject) => {
            connection.commit((error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
          res.status(200).send();
      }
      catch{
        await new Promise((resolve, reject) => {
            connection.rollback((error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
          console.log('=== done rollback ===')
          res.status(400).send();
      }
      finally{
        connection.release();
        pool.end();
      }
});

app.post('/mstinventory/delete', (req, res) => {
    const sql = 'UPDATE m_inventory SET delete_at = NOW() WHERE inventory_id = ?';
    connection.query(sql, [req.body.inventory_id],
        (error, result) => {
            if(error) {
                console.log(error)
            }
            else{
                res.status(200).json(result);
            }
          });
});

app.get('/inout', (req, res) => {
  const sql = `SELECT 
               t_inout.inout_id,
               t_inout.inout_flag,
               t_inout.inout_datetime ,
               t_inout.quantity,
               t_inout.note,
               m_inventory.inventory_name
               FROM t_inout
               INNER JOIN m_inventory ON t_inout.inventory_id = m_inventory.inventory_id
                   AND m_inventory.delete_at IS NULL
                   AND m_inventory.update_at IS NULL
               WHERE t_inout.delete_at IS NULL
               AND t_inout.update_at IS NULL
               ORDER BY t_inout.inout_datetime DESC`;
  connection.query(sql, function (err, result, fields) {
      if (err) {
          connection.rollback(() => err);
          throw err;
      }
      res.status(200).json(result);
  });
});

app.post('/input/insert', async (req, res, next) => {
  const pool = mysql.createPool(poolOption);
  const connection = await new Promise((resolve, reject) => {
      pool.getConnection((error, connection) => {
        if (error) reject(error)
        resolve(connection)
      })
    })

    try{
        await new Promise((resolve, reject) => {
          connection.beginTransaction((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })

        if(req.body.inout_id !== 0){
          await new Promise((resolve, reject) => {
            const update = `UPDATE t_inout
                            SET update_at = NOW()
                            WHERE inout_id = ?
                            AND update_at IS NULL`;

            const updateparam = [
                req.body.inout_id,
            ];
            connection.query(update, updateparam, (error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
        }

        await new Promise((resolve, reject) => {
          const insert = `INSERT t_inout(
            inout_id,
            inout_flag,
            inout_datetime,
            inventory_id,
            inventory,
            note,
            insert_at,
            update_at,
            delete_at,
            insert_user_id
            )
              VALUES((SELECT IFNULL(max_id + 1, 1) from (SELECT max(inout_id) AS max_id FROM t_inout) AS temp), ?, ?, ?, ?, ?, NOW(), NULL, NULL, ?)`;

          const insertparam = [
              req.body.inout_flag,
              req.body.inout_datetime,
              req.body.inventory_id,
              req.body.inventory,
              req.body.note,
              req.body.insert_user_id
          ];
          
          connection.query(insert, insertparam, (error, results) => {
            if (error) {
              console.log(error);
              reject(error);
            }
            resolve(results)
          })
        })

        await new Promise((resolve, reject) => {
          connection.commit((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })
        res.status(200).send();
    }
    catch{
      await new Promise((resolve, reject) => {
          connection.rollback((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })
        console.log('=== done rollback ===')
        res.status(400).send();
    }
    finally{
      connection.release();
      pool.end();
    }
});

app.get('/inout/edit', (req, res) => {
  const sql = `SELECT * FROM t_inout
               WHERE inout_id = ?`;
  connection.query(sql, [req.query.inout_id],
      (error, result) => {
          if(error) {
              console.log(error)
          }
          else{
              res.status(200).json(result);
          }
      });
});

app.post('/inout/delete', (req, res) => {
  const sql = 'UPDATE t_inout SET delete_at = NOW() WHERE inout_id = ?';
  connection.query(sql, [req.body.inventory_id],
      (error, result) => {
          if(error) {
              console.log(error)
          }
          else{
              res.status(200).json(result);
          }
        });
});

app.get('/inventorylist', (req, res) => {
  const sql = `SELECT 
               m_inventory.inventory_id,
               m_inventory.inventory_name,
               m_inventory.inventory_kana,
               m_inventory.jancode,
               m_inventory.skucode,
               m_inventory.location,
               m_inventory.note,
               m_inventory.tag,
               m_inventory.unit,
               (SELECT SUM(CASE inout_flag WHEN 1 THEN quantity WHEN 2 THEN -quantity ELSE 0 END) AS number
                FROM t_inout
                WHERE t_inout.update_at IS NULL
                AND t_inout.delete_at IS NULL
                AND t_inout.inventory_id = m_inventory.inventory_id) AS number
               FROM m_inventory
              WHERE m_inventory.update_at IS NULL
              AND m_inventory.delete_at IS NULL
              AND m_inventory.display_flag = 1
              ORDER BY m_inventory.display_no`;
  connection.query(sql, function (err, result, fields) {
      if (err) {
          connection.rollback(() => err);
          throw err;
      }
      res.status(200).json(result);
  });
});

app.get('/master/account', (req, res) => {
  const sql = `SELECT * FROM m_user
               WHERE update_at IS NULL
               AND delete_at IS NULL
               ORDER BY user_id`;
  connection.query(sql, function (err, result, fields) {
      if (err) {
          connection.rollback(() => err);
          throw err;
      }
      res.status(200).json(result);
  });
});

app.get('/master/account/edit', (req, res) => {
  const sql = `SELECT * FROM m_user
               WHERE user_id = ?
               AND update_at IS NULL
               AND delete_at IS NULL`;
  connection.query(sql, [req.query.user_id],
      (error, result) => {
          if(error) {
              console.log(error)
          }
          else{
              res.status(200).json(result);
          }
      });
});

app.post('/master/account/insert', async (req, res, next) => {
  const pool = mysql.createPool(poolOption);
  const connection = await new Promise((resolve, reject) => {
      pool.getConnection((error, connection) => {
        if (error) reject(error)
        resolve(connection)
      })
    })

    try{
        await new Promise((resolve, reject) => {
          connection.beginTransaction((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })

        if(req.body.user_id !== 0){
          await new Promise((resolve, reject) => {
            const update = `UPDATE m_user
                            SET update_at = NOW()
                            WHERE user_id = ?
                            AND update_at IS NULL`;

            const updateparam = [
                req.body.user_id,
            ];
            connection.query(update, updateparam, (error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
        }

        const id = req.body.user_id !== 0 ? req.body.user_id : "(SELECT IFNULL(max_id + 1, 1) from (SELECT max(inout_id) AS max_id FROM t_inout) AS temp)";
        await new Promise((resolve, reject) => {
          const insert = `INSERT m_user(
            user_id,
            user_name,
            login_id,
            login_password,
            administrator,
            display_flag,
            display_no,
            insert_at,
            update_at,
            delete_at,
            insert_user_id
            )
              VALUES(`+ id +`, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL, ?)`;

          const insertparam = [
              req.body.user_name,
              req.body.login_id,
              req.body.login_password,
              req.body.administrator,
              req.body.display_flag,
              req.body.display_no,
              req.body.insert_user_id,
          ];
          
          connection.query(insert, insertparam, (error, results) => {
            if (error) {
              console.log(error);
              reject(error);
            }
            resolve(results)
          })
        })

        await new Promise((resolve, reject) => {
          connection.commit((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })
        res.status(200).send();
    }
    catch{
      await new Promise((resolve, reject) => {
          connection.rollback((error, results) => {
            if (error) reject(error)
            resolve(results)
          })
        })
        console.log('=== done rollback ===')
        res.status(400).send();
    }
    finally{
      connection.release();
      pool.end();
    }
});

app.post('/master/account/delete', (req, res) => {
  const sql = 'UPDATE m_user SET delete_at = NOW() WHERE user_id = ?';
  connection.query(sql, [req.body.user_id],
      (error, result) => {
          if(error) {
              console.log(error)
          }
          else{
              res.status(200).json(result);
          }
        });
});

app.get('/login', (req, res) => {
  const sql = `SELECT * FROM m_user
               WHERE login_id = ?
               AND login_password = ?
               AND update_at IS NULL
               AND delete_at IS NULL`;
  connection.query(sql, [req.query.login_id, req.query.login_password],
      (error, result) => {
          if(error) {
            console.log(error)
          }
          else{
            res.status(200).json(result);
          }
        });
});

// app.listen(process.env.PORT || port);
app.listen(process.env.PORT || port, () => {
    console.log(`listening on *:${port}`);
})