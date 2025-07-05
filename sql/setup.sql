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
    CreatedAt DATETIME DEFAULT GETDATE()
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
    Rating FLOAT DEFAULT 0
);

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
INSERT INTO Users (FullName, Username, Password, Role, Phone, Email, Address) VALUES
('Karun Kumar', 'karun', '1234', 'customer', '1234567890', 'karun@example.com', '123 Maple Street, Waterloo'),
('Vinay Tech', 'vinay', 'abcd', 'provider', '9876543210', 'vinay@example.com', '456 Oak Avenue, Kitchener'),
('Admin Master', 'admin', 'adminpass', 'admin', NULL, NULL, NULL),
('John Doe', 'john', 'john123', 'customer', '1112223333', 'john@example.com', '789 Pine Drive, Toronto'),
('Priya Sharma', 'priya', 'priya123', 'provider', '2223334444', 'priya@example.com', '101 Cedar Lane, Mississauga'),
('Megha Rao', 'megha', 'megha123', 'customer', '3334445555', 'megha@example.com', '202 Birch Road, Guelph');

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



-- Insert SAMPLE TIME SLOTS for providers (2025-07-21)
INSERT INTO ProviderTimeSlots (ProviderID, SlotStart, SlotEnd, IsAvailable) VALUES
-- Vinay (Plumbing)
(1, '2025-07-21T09:00:00', '2025-07-21T10:00:00', 1),
(1, '2025-07-21T11:00:00', '2025-07-21T12:00:00', 1),

-- Priya (Electrician)
(2, '2025-07-21T10:00:00', '2025-07-21T11:00:00', 1),
(2, '2025-07-21T14:00:00', '2025-07-21T15:00:00', 1),

-- Vinay (AC Repair)
(3, '2025-07-21T08:00:00', '2025-07-21T09:30:00', 1),

-- Priya (Painting)
(4, '2025-07-21T16:00:00', '2025-07-21T18:00:00', 1),

-- Vinay (Carpentry)
(5, '2025-07-21T13:00:00', '2025-07-21T14:00:00', 1);

