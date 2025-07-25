-- Drop and recreate the HomeConnect database
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'HomeConnect')
BEGIN
    ALTER DATABASE HomeConnect SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HomeConnect;
END
GO

CREATE DATABASE HomeConnect;
GO

USE HomeConnect;
GO

-- USERS table with phone, email, and address
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY,
    FullName NVARCHAR(100) NOT NULL,
    Username NVARCHAR(100) UNIQUE NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL,
    Phone NVARCHAR(15),
    Email NVARCHAR(100),
    Address NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
	IsApproved BIT DEFAULT 0
);

-- PROVIDERS table with experience and certification
CREATE TABLE Providers (
    ProviderID INT PRIMARY KEY IDENTITY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID),
    ServiceType NVARCHAR(100),
    Experience INT,
    CertFilePath NVARCHAR(255),
    Description NVARCHAR(255),
    Availability NVARCHAR(100),
    Rating FLOAT DEFAULT 0,
	Status NVARCHAR(20) DEFAULT 'Pending'
);

ALTER TABLE Providers
ADD CONSTRAINT CHK_ProviderStatus CHECK (Status IN ('Approved', 'Pending', 'Declined'));

-- BOOKINGS table
CREATE TABLE Bookings (
    BookingID INT PRIMARY KEY IDENTITY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID),
    ProviderID INT FOREIGN KEY REFERENCES Providers(ProviderID),
    ServiceDate DATETIME,
    Status NVARCHAR(50) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- REVIEWS table
CREATE TABLE Reviews (
    ReviewID INT PRIMARY KEY IDENTITY,
    BookingID INT FOREIGN KEY REFERENCES Bookings(BookingID),
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    Comment NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- PROVIDER TIME SLOTS table
CREATE TABLE ProviderTimeSlots (
    SlotID INT PRIMARY KEY IDENTITY,
    ProviderID INT FOREIGN KEY REFERENCES Providers(ProviderID),
    SlotStart DATETIME NOT NULL,
    SlotEnd DATETIME NOT NULL,
    IsAvailable BIT DEFAULT 1
);

-- Insert SAMPLE USERS
INSERT INTO Users (FullName, Username, Password, Role, Phone, Email, Address, IsApproved) VALUES
('Karun Kumar', 'karun', '1234', 'customer', '1234567890', 'karun@example.com', '123 Maple Street, Waterloo', NULL),
('Vinay Tech', 'vinay', 'abcd', 'provider', '9876543210', 'vinay@example.com', '456 Oak Avenue, Kitchener', 0),
('Admin Master', 'admin', 'adminpass', 'admin', NULL, NULL, NULL, NULL),
('John Doe', 'john', 'john123', 'customer', '1112223333', 'john@example.com', '789 Pine Drive, Toronto', NULL),
('Priya Sharma', 'priya', 'priya123', 'provider', '2223334444', 'priya@example.com', '101 Cedar Lane, Mississauga', 0),
('Megha Rao', 'megha', 'megha123', 'customer', '3334445555', 'megha@example.com', '202 Birch Road, Guelph', NULL);


-- Insert SAMPLE PROVIDERS
INSERT INTO Providers (UserID, ServiceType, Experience, CertFilePath, Description, Availability, Rating) VALUES
(2, 'Plumbing', 5, 'certs/vinay_plumbing.pdf', 'Expert in home plumbing and leaks.', 'Mon-Fri 9am-5pm', 4.5),
(5, 'Electrician', 7, 'certs/priya_electric.pdf', 'Handles all wiring and appliance issues.', 'Tue-Sat 10am-6pm', 4.2),
(2, 'AC Repair', 6, NULL, 'Air conditioning servicing and installation.', 'Mon-Fri 8am-4pm', 4.8),
(5, 'Painting', 4, 'certs/priya_painting.jpg', 'Interior and exterior painting.', 'Weekend only', 4.0),
(2, 'Carpentry', 10, NULL, 'Furniture repair and modular kitchen fittings.', 'Flexible hours', 4.7);

-- Insert SAMPLE BOOKINGS
INSERT INTO Bookings (UserID, ProviderID, ServiceDate, Status) VALUES
(1, 1, '2025-06-15 10:00:00', 'Confirmed'),
(4, 2, '2025-06-16 14:00:00', 'Pending'),
(6, 3, '2025-06-17 09:00:00', 'Completed'),
(1, 4, '2025-06-18 12:00:00', 'Cancelled'),
(4, 5, '2025-06-19 16:30:00', 'Confirmed'),
(6, 1, '2025-06-20 11:15:00', 'Pending');

-- Insert SAMPLE REVIEWS
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(1, 5, 'Excellent service!'),
(3, 4, 'Job done well, but came a bit late.'),
(5, 5, 'Very friendly and professional.'),
(2, 3, 'Satisfactory, could be better.'),
(4, 2, 'Did not show up on time.');

-- More samples for easy testing

-- Reviews for Provider 1 (Plumbing - Vinay) → Bookings 1 & 6
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(1, 5, 'Vinay was prompt and fixed the leak quickly.'),
(6, 4, 'Great plumbing work, just a bit late.'),
(1, 5, 'Very professional and explained everything clearly.');

-- Reviews for Provider 2 (Electrician - Priya) → Booking 2
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(2, 4, 'Solved my wiring issue efficiently.'),
(2, 3, 'Took a bit longer, but the issue was resolved.'),
(2, 5, 'Excellent troubleshooting skills!');

-- Reviews for Provider 3 (AC Repair - Vinay) → Booking 3
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(3, 5, 'Cool air restored fast. Highly recommended!'),
(3, 4, 'Good work, but needed slight follow-up.'),
(3, 5, 'He also gave great AC maintenance tips.');

-- Reviews for Provider 4 (Painting - Priya) → Booking 4
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(4, 4, 'Lovely wall finish, colors matched perfectly.'),
(4, 2, 'Was late and didn’t complete in one visit.'),
(4, 3, 'Decent job, but some spots were left out.');

-- Reviews for Provider 5 (Carpentry - Vinay) → Booking 5
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(5, 5, 'Built my shelves exactly as I wanted.'),
(5, 4, 'Very skilled and polite.'),
(5, 5, 'Perfect fit and finish — great work!');




-- Insert SAMPLE TIME SLOTS for providers (2025-07-21)
INSERT INTO ProviderTimeSlots (ProviderID, SlotStart, SlotEnd, IsAvailable) VALUES
-- Vinay (Plumbing)
(1, '2025-08-21T09:00:00', '2025-08-21T10:00:00', 1),
(1, '2025-08-21T11:00:00', '2025-08-21T12:00:00', 1),

-- Priya (Electrician)
(2, '2025-08-21T10:00:00', '2025-08-21T11:00:00', 1),
(2, '2025-08-21T14:00:00', '2025-08-21T15:00:00', 1),

-- Vinay (AC Repair)
(3, '2025-08-21T08:00:00', '2025-08-21T09:30:00', 1),

-- Priya (Painting)
(4, '2025-08-21T16:00:00', '2025-08-21T18:00:00', 1),

-- Vinay (Carpentry)
(5, '2025-08-21T13:00:00', '2025-08-21T14:00:00', 1);



-- Altering table to add Service Address

ALTER TABLE Bookings
ADD ServiceAddress NVARCHAR(255);


CREATE TABLE Locations (
    LocationID INT PRIMARY KEY IDENTITY(1,1),
    City NVARCHAR(100) NOT NULL
);

INSERT INTO Locations (City) VALUES 
('Waterloo'),
('Kitchener'),
('Toronto'),
('Mississauga'),
('Guelph');


ALTER TABLE Providers
ADD LocationID INT FOREIGN KEY REFERENCES Locations(LocationID);


-- Vinay – lives in Waterloo (LocationID = 1)
UPDATE Providers SET LocationID = 1 WHERE ProviderID IN (1, 3, 5);

-- Priya –lives in Kitchener (LocationID = 2)
UPDATE Providers SET LocationID = 2 WHERE ProviderID IN (2, 4);

