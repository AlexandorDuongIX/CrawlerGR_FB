import psycopg2

conn = psycopg2.connect(host='localhost', port=5432, dbname='GR_Crawler', user='postgres', password='postgres')
cur = conn.cursor()
cur.execute("SELECT caption FROM posts WHERE caption LIKE '%bài Ẩn bớt%'")
rows = cur.fetchall()
if rows:
    print(repr(rows[0][0]))
else:
    print("Not found")
