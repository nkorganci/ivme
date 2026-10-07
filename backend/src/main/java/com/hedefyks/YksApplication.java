package com.hedefyks;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class YksApplication {

    public static void main(String[] args) {
        SpringApplication.run(YksApplication.class, args);
    }
}
