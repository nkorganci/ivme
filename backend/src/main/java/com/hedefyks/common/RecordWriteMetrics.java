package com.hedefyks.common;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/** Kayıt transaction'ı döndükten sonra sonucu ve süreyi DB'den bağımsız bellekte ölçer. */
@Component
public class RecordWriteMetrics {
    private final MeterRegistry registry;

    public RecordWriteMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public <T> T measure(String operation, Supplier<T> write) {
        long started = System.nanoTime();
        String result = "success";
        try {
            return write.get();
        } catch (RuntimeException error) {
            result = "failure";
            throw error;
        } finally {
            Timer.builder("ivme.record.write")
                    .description("Committed record request duration and result")
                    .tags("operation", operation, "result", result)
                    .publishPercentiles(0.95)
                    .register(registry).record(System.nanoTime() - started, java.util.concurrent.TimeUnit.NANOSECONDS);
        }
    }
}
