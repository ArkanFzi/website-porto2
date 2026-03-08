package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/arkanFzi/website-porto2/go-backend/mailer"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// -- Models --

type Certificate struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Title     string    `gorm:"not null" json:"title"`
	Issuer    string    `gorm:"not null" json:"issuer"`
	Date      string    `gorm:"not null" json:"date"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Experience struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Role      string    `gorm:"not null" json:"role"`
	Company   string    `gorm:"not null" json:"company"`
	Period    string    `gorm:"not null" json:"period"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

var DB *gorm.DB

func initDB() {
	// Try loading .env file if exists
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=root password=rootpassword dbname=portfolio_db port=5433 sslmode=disable TimeZone=Asia/Jakarta"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Migrate the schema
	err = DB.AutoMigrate(&Certificate{}, &Experience{})
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connection established and schema migrated.")
}

func main() {
	initDB()

	// Seed dummy data if empty
	seedData()

	r := gin.Default()

	// CORS Setup - Allow the Next.js frontend to access
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // Next.js port
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// -- API Routes --
	api := r.Group("/api")

	// Certificates
	api.GET("/certificates", func(c *gin.Context) {
		var certs []Certificate
		DB.Order("created_at desc").Find(&certs)
		c.JSON(http.StatusOK, certs)
	})

	api.POST("/certificates", func(c *gin.Context) {
		var cert Certificate
		if err := c.ShouldBindJSON(&cert); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		DB.Create(&cert)
		c.JSON(http.StatusCreated, cert)
	})

	api.DELETE("/certificates/:id", func(c *gin.Context) {
		id := c.Param("id")
		DB.Delete(&Certificate{}, "id = ?", id)
		c.JSON(http.StatusOK, gin.H{"message": "deleted"})
	})

	// Experiences
	api.GET("/experience", func(c *gin.Context) {
		var exps []Experience
		DB.Order("created_at desc").Find(&exps)
		c.JSON(http.StatusOK, exps)
	})

	api.POST("/experience", func(c *gin.Context) {
		var exp Experience
		if err := c.ShouldBindJSON(&exp); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		DB.Create(&exp)
		c.JSON(http.StatusCreated, exp)
	})

	api.DELETE("/experience/:id", func(c *gin.Context) {
		id := c.Param("id")
		DB.Delete(&Experience{}, "id = ?", id)
		c.JSON(http.StatusOK, gin.H{"message": "deleted"})
	})

	//api contact
	api.POST("/contact", func(c *gin.Context) {
		var msg struct {
			Name    string `json:"name"`
			Email   string `json:"email"`
			Subject string `json:"subject"`
			Body    string `json:"body"`
		}

		if err := c.ShouldBindJSON(&msg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format data salah"})
			return
		}

		adminEmail := "muhammadarkanfauzi9@gmail.com"

		fullBody := fmt.Sprintf("Pesan dari: %s (%s)\n\nIsi Pesan:\n%s", msg.Name, msg.Email, msg.Body)

		go func() {
			err := mailer.SendEmail(adminEmail, "Contact Form: "+msg.Subject, fullBody)
			if err != nil {
				fmt.Printf("Gagal kirim email: %v\n", err)
			}
		}()
		c.JSON(http.StatusOK, gin.H{
			"message": "Pesan kamu sedang dikirim, terima kasih!",
		})
	})

	log.Println("Server running on port 8080")
	r.Run(":8080")

}

func seedData() {
	var certCount int64
	DB.Model(&Certificate{}).Count(&certCount)
	if certCount == 0 {
		DB.Create(&Certificate{Title: "AWS Solutions Architect", Issuer: "Amazon Web Services", Date: "2024"})
		DB.Create(&Certificate{Title: "Advanced React Patterns", Issuer: "Frontend Masters", Date: "2023"})
		DB.Create(&Certificate{Title: "Full-Stack Design", Issuer: "Educative", Date: "2023"})
		log.Println("Seeded Certificates.")
	}

	var expCount int64
	DB.Model(&Experience{}).Count(&expCount)
	if expCount == 0 {
		DB.Create(&Experience{Role: "Senior Software Engineer", Company: "TechNova Solutions", Period: "2023 - Pres"})
		DB.Create(&Experience{Role: "Fullstack Developer", Company: "Digital Artisan", Period: "2021 - 2023"})
		log.Println("Seeded Experiences.")
	}
}
