
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

-- LOCATIONS table
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

-- USERS table
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

-- PROVIDERS table
CREATE TABLE Providers (
    ProviderID INT PRIMARY KEY IDENTITY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID),
    ServiceType NVARCHAR(100),
    Experience INT,
    CertFilePath NVARCHAR(255),
    Description NVARCHAR(255),
    Availability NVARCHAR(100),
    Rating FLOAT DEFAULT 0,
    Status NVARCHAR(20) DEFAULT 'Pending',
    LocationID INT FOREIGN KEY REFERENCES Locations(LocationID),
    CONSTRAINT CHK_ProviderStatus CHECK (Status IN ('Approved', 'Pending', 'Declined'))
);

-- BOOKINGS table
CREATE TABLE Bookings (
    BookingID INT PRIMARY KEY IDENTITY,
    UserID INT FOREIGN KEY REFERENCES Users(UserID),
    ProviderID INT FOREIGN KEY REFERENCES Providers(ProviderID),
    ServiceDate DATETIME,
    Status NVARCHAR(50) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    ServiceAddress NVARCHAR(255)
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

-- SAMPLE USERS
INSERT INTO Users (FullName, Username, Password, Role, Phone, Email, Address, IsApproved) VALUES
('Karun Kumar', 'karun', '1234', 'customer', '1234567890', 'karun@example.com', '123 Maple Street, Waterloo', NULL),
('Vinay Tech', 'vinay', 'abcd', 'provider', '9876543210', 'vinay@example.com', '456 Oak Avenue, Kitchener', 0),
('Admin Master', 'admin', 'adminpass', 'admin', NULL, NULL, NULL, NULL),
('John Doe', 'john', 'john123', 'customer', '1112223333', 'john@example.com', '789 Pine Drive, Toronto', NULL),
('Priya Sharma', 'priya', 'priya123', 'provider', '2223334444', 'priya@example.com', '101 Cedar Lane, Mississauga', 0),
('Megha Rao', 'megha', 'megha123', 'customer', '3334445555', 'megha@example.com', '202 Birch Road, Guelph', NULL);

-- SAMPLE PROVIDERS (1 service per provider-user pair)
INSERT INTO Providers (UserID, ServiceType, Experience, CertFilePath, Description, Availability, Rating, LocationID) VALUES
(2, 'Plumbing', 5, 'certs/vinay_plumbing.pdf', 'Expert in home plumbing and leaks.', 'Mon-Fri 9am-5pm', 4.5, 1),
(5, 'Electrician', 7, 'certs/priya_electric.pdf', 'Handles all wiring and appliance issues.', 'Tue-Sat 10am-6pm', 4.2, 2);

-- SAMPLE BOOKINGS
INSERT INTO Bookings (UserID, ProviderID, ServiceDate, Status, ServiceAddress) VALUES
(1, 1, '2025-06-15 10:00:00', 'Confirmed', '123 Maple Street, Waterloo'),
(4, 2, '2025-06-16 14:00:00', 'Pending', '789 Pine Drive, Toronto');

-- SAMPLE REVIEWS
INSERT INTO Reviews (BookingID, Rating, Comment) VALUES
(1, 5, 'Excellent service!'),
(1, 4, 'Vinay was prompt and fixed the leak quickly.'),
(2, 4, 'Solved my wiring issue efficiently.');

-- SAMPLE TIME SLOTS
INSERT INTO ProviderTimeSlots (ProviderID, SlotStart, SlotEnd, IsAvailable) VALUES
(1, '2025-08-21T09:00:00', '2025-08-21T10:00:00', 1),
(1, '2025-08-21T11:00:00', '2025-08-21T12:00:00', 1),
(2, '2025-08-21T10:00:00', '2025-08-21T11:00:00', 1),
(2, '2025-08-21T14:00:00', '2025-08-21T15:00:00', 1);
