PRAGMA foreign_keys=OFF;

DELETE FROM outfit_garments;
DELETE FROM outfit_calendar;
DELETE FROM outfit;
DELETE FROM garment;
DELETE FROM user;

INSERT INTO user
(id, shareable_id, email, password, first_name, last_name)
VALUES
(1, 'user-test-001', 'test@example.com', 'testpassword', 'Test', 'User');


INSERT INTO garment
(id, shareable_id, name, category, owner_id, archived, brand, color, size)
VALUES
(1,'garment-001','Black T-Shirt','shirt',1,0,'Uniqlo',1,'M'),
(2,'garment-002','Blue Hoodie','hoodie',1,0,'Patagonia',2,'M'),
(3,'garment-003','Jeans','pants',1,0,'Levis',3,'32'),
(4,'garment-004','White Button Shirt','shirt',1,0,'Everlane',4,'M'),
(5,'garment-005','Brown Boots','shoes',1,0,'Red Wing',5,'10'),
(6,'garment-006','Green Jacket','jacket',1,0,'North Face',6,'M'),
(7,'garment-007','Grey Sweater','sweater',1,0,'J Crew',7,'M'),
(8,'garment-008','Black Chinos','pants',1,0,'Dockers',8,'32'),
(9,'garment-009','Running Shoes','shoes',1,0,'Nike',9,'10'),
(10,'garment-010','Denim Jacket','jacket',1,0,'Levis',10,'M');


INSERT INTO outfit
(id, shareable_id, name, owner_id, notes)
VALUES
(1,'outfit-001','Casual Day',1,'frequently worn'),
(2,'outfit-002','Work Outfit',1,'office'),
(3,'outfit-003','Weekend',1,'relaxed'),
(4,'outfit-004','Rainy Day',1,'weather gear'),
(5,'outfit-005','Night Out',1,'dressy');


INSERT INTO outfit_garments VALUES
(1,1),(1,2),(1,3),
(2,4),(2,8),(2,5),
(3,2),(3,7),(3,9),
(4,6),(4,2),(4,5),
(5,4),(5,5),(5,9);


INSERT INTO outfit_calendar
(date,outfit_id,owner_id,worn_at,notes)
VALUES

INSERT INTO outfit_calendar
(date,outfit_id,owner_id,worn_at,notes)
VALUES
('2026-07-01',1,1,'2026-07-01',''),
('2026-07-02',2,1,'2026-07-02',''),
('2026-07-03',3,1,'2026-07-03',''),
('2026-07-04',1,1,'2026-07-04',''),
('2026-07-05',4,1,'2026-07-05',''),
('2026-07-06',5,1,'2026-07-06',''),
('2026-07-07',1,1,'2026-07-07',''),
('2026-07-08',2,1,'2026-07-08',''),
('2026-07-09',3,1,'2026-07-09',''),
('2026-07-10',4,1,'2026-07-10',''),
('2026-07-11',5,1,'2026-07-11','');


PRAGMA foreign_keys=ON;
