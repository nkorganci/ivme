package com.hedefyks;

import static org.assertj.core.api.Assertions.assertThat;

import com.hedefyks.config.ActivityRetention;
import com.hedefyks.user.Role;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ActivityRetentionTest extends TestBase {

    @Autowired ActivityRetention retention;

    @Test
    void doksanGundenEskiHamOlaylariSiler() {
        long id = user("ayse", Role.USER).getId();
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type,created_at) "
                + "VALUES (?,?::uuid,'LOGIN',now()-interval '91 days')", id, UUID.randomUUID().toString());
        jdbc.update("INSERT INTO activity_events(user_id,session_key,event_type,created_at) "
                + "VALUES (?,?::uuid,'LOGIN',now()-interval '89 days')", id, UUID.randomUUID().toString());

        retention.removeExpiredEvents();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM activity_events", Integer.class)).isEqualTo(1);
    }
}
