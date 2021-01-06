CREATE DATABASE bagholder;

CREATE TABLE comments(
  comment_id SERIAL PRIMARY KEY,
  body VARCHAR,
  time VARCHAR,
  stockMentions VARCHAR
);


CREATE TABLE stockMentioned(
  stock_id SERIAL PRIMARY KEY,
  stockName VARCHAR

);

/*junction table for stocks/comments */
CREATE TABLE stockAssign(
  comment_id SERIAL,
  stock_id SERIAL


);
