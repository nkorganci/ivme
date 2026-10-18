package com.hedefyks.config;

import org.apache.catalina.connector.Connector;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Keeps the existing local Cloudflare ingress on the same main application. */
@Configuration(proxyBeanMethods = false)
public class TunnelConnectorConfiguration {
    @Bean
    @ConditionalOnExpression("${app.tunnel-port:0} > 0")
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> tunnelConnector(
            @Value("${app.tunnel-port}") int port,
            @Value("${server.port:8081}") int applicationPort) {
        if (port > 65535 || port == applicationPort) {
            throw new IllegalArgumentException("Tunnel port must be a distinct TCP port.");
        }
        return factory -> {
            Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
            connector.setPort(port);
            connector.setProperty("address", "127.0.0.1");
            factory.addAdditionalTomcatConnectors(connector);
        };
    }
}
