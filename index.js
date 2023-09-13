// npm install express
// npm install mysql2
// npm run start-node

const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3001;

app.use(express.json());

const poolOption = {
    connectionLimit : 1,
    host: 'localhost',
    user: 'root',
    password: 'xeno1508',
    database: 'stock',
    timezone: 'jst'
};

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'xeno1508',
    database: 'stock'
});

app.get('/mstinventory', (req, res) => {
    const sql = `SELECT * FROM m_inventory
                 WHERE delete_at IS NULL
                 AND update_at IS NULL
                 ORDER BY inventory_id`;
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

app.post('/mstinventory_insert', async (req, res, next) => {
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
            const id = req.body.inventory_id !== 0 ? req.body.inventory_id : '(SELECT IFNULL(max_id + 1, 1) from (SELECT max(inventory_id) AS max_id FROM m_inventory) AS temp)';
            const insert = `INSERT m_inventory(
                inventory_id,
                inventory_name,
                inventory_kana,
                picture, 
                category_id,
                jancode,
                skucode,
                unit_id,
                price,
                price_cost,
                inventory_max,
                inventory_min,
                location,
                url,
                note,
                display_flag,
                insert_at,
                update_at,
                delete_at,
                insert_user_id)
                VALUES(` + id + `, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL, ?)`;

            const insertparam = [
                req.body.inventory_name,
                req.body.inventory_kana,
                req.body.picture,
                req.body.category_id,
                req.body.jancode,
                req.body.skucode,
                req.body.unit_id,
                req.body.price,
                req.body.price_cost,
                req.body.inventory_max,
                req.body.inventory_min,
                req.body.location,
                req.body.url,
                req.body.note,
                req.body.display_flag,
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

app.post('/mstinventory_delete', (req, res) => {
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
               t_inout.inventory,
               t_inout.note,
               m_inventory.inventory_name
               FROM t_inout
               INNER JOIN stock.m_inventory ON t_inout.inventory_id = m_inventory.inventory_id
                   AND m_inventory.delete_at IS NULL
                   AND m_inventory.update_at IS NULL
               WHERE t_inout.delete_at IS NULL
               AND t_inout.update_at IS NULL
               ORDER BY t_inout.insert_at DESC`;
  connection.query(sql, function (err, result, fields) {
      if (err) {
          connection.rollback(() => err);
          throw err;
      }
      res.status(200).json(result);
  });
});

app.listen(port, () => {
    console.log(`listening on *:${port}`);
})