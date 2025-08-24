'use strict'

const path = require('path')
const Database = require('better-sqlite3')

const db = new Database(path.resolve(__dirname, '../count.db'))

db.exec(`CREATE TABLE IF NOT EXISTS tb_count (
    id    INTEGER      PRIMARY KEY AUTOINCREMENT
                       NOT NULL
                       UNIQUE,
    name  VARCHAR (32) NOT NULL
                       UNIQUE,
    num   BIGINT       NOT NULL
                       DEFAULT (0) 
);`)

db.exec(`CREATE TABLE IF NOT EXISTS tb_seen(
  name   VARCHAR(32) NOT NULL,
  ip     TEXT        NOT NULL,
  expire INTEGER     NOT NULL,
  UNIQUE(name, ip)
);
CREATE INDEX IF NOT EXISTS idx_seen_expire ON tb_seen(expire);`)

function nowSec () { return Math.floor(Date.now() / 1000) }

function getNum(name) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('SELECT `name`, `num` from tb_count WHERE `name` = ?')
    const row = stmt.get(name)
    resolve(row || { name, num: 0 })
  })
}

function getAll(name) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('SELECT * from tb_count')
    const rows = stmt.all()
    resolve(rows)
  })
}

function setNum(name, num) {
  return new Promise((resolve, reject) => {
    db.exec(`INSERT INTO tb_count(\`name\`, \`num\`)
            VALUES($name, $num)
            ON CONFLICT(name) DO
            UPDATE SET \`num\` = $num;`
      ,
      { $name: name, $num: num }
    )

    resolve()
  })
}

function setNumMulti(counters) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO tb_count(\`name\`, \`num\`)
    VALUES($name, $num)
    ON CONFLICT(name) DO
    UPDATE SET \`num\` = $num;`)

    const setMany = db.transaction((counters) => {
      for (const counter of counters) stmt.run(counter)
    })

    setMany(counters)
    resolve()
  })
}

function shouldCount(name, ip, ttlSec = 31536000){
  const t = nowSec()
  const expireAt = t + ttlSec

  db.prepare('DELETE FROM tb_seen WHERE expire < ?').run(t)

  const select = db.prepare('SELECT expire FROM tb_seen WHERE name = ? AND ip = ?')
  const row = select.get(name, ip)

  if (row && row.expire > t) {
    return Promise.resolve(true)
  }

  db.prepare(`INSERT INTO tb_seen(name, ip, expire) VALUES(?, ?, ?)
              ON CONFLICT(name, ip) DO UPDATE SET expire = excluded.expire`)
    .run(name, ip, expireAt)

  return Promise.resolve(false)
}

module.exports = {
  getNum,
  getAll,
  setNum,
  setNumMulti,
  shouldCount,
  nowSec
}