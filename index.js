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
    AND update_at IS NULL`;
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
          console.log('=== done beginTransaction ===')

          await new Promise((resolve, reject) => {
            const update = `UPDATE m_inventory
            SET update_at = NOW()
            WHERE inventory_id = ?`;

            const updateparam = [
                req.body.inventory_id,
            ];
            connection.query(update, updateparam, (error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
          console.log('=== done update ===');

          await new Promise((resolve, reject) => {
            const insert = ` INSERT m_inventory(
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
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, NULL, ?)`;

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
              if (error) reject(error)
              resolve(results)
            })
          })
          console.log('=== done insert ===');

          await new Promise((resolve, reject) => {
            connection.commit((error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
          console.log('=== done commit ===');
      }
      catch{
        await new Promise((resolve, reject) => {
            connection.rollback((error, results) => {
              if (error) reject(error)
              resolve(results)
            })
          })
          console.log('=== done rollback ===')
      }
      finally{
        connection.release();
        console.log('=== done release ===');
        pool.end();
        console.log('=== done poolend ===');
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

app.listen(port, () => {
    console.log(`listening on *:${port}`);
})