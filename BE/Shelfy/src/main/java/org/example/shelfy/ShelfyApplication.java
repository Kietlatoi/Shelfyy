package org.example.shelfy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ShelfyApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShelfyApplication.class, args);
    }
}
