package it.pv.payments.domain;

import jakarta.persistence.*;

/** Riga singleton (id sempre 1): slot di consegna disponibili. */
@Entity
@Table(name = "config_delivery")
public class DeliveryConfig {
    @Id
    private Long id = 1L;

    /** JSON List<Integer> 1=lunedi..7=domenica */
    @Lob
    private String weekdaysJson;

    /** JSON List<{start,end}> */
    @Lob
    private String timeRangesJson;

    private Integer slotsAhead;
    private String timezone = "Europe/Rome";
    private Integer minLeadDays;

    /** JSON List<String> date YYYY-MM-DD escluse */
    @Lob
    private String blacklistDatesJson;

    /** JSON List<{from,to}> range di date escluse */
    @Lob
    private String blacklistRangesJson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getWeekdaysJson() { return weekdaysJson; }
    public void setWeekdaysJson(String weekdaysJson) { this.weekdaysJson = weekdaysJson; }
    public String getTimeRangesJson() { return timeRangesJson; }
    public void setTimeRangesJson(String timeRangesJson) { this.timeRangesJson = timeRangesJson; }
    public Integer getSlotsAhead() { return slotsAhead; }
    public void setSlotsAhead(Integer slotsAhead) { this.slotsAhead = slotsAhead; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public Integer getMinLeadDays() { return minLeadDays; }
    public void setMinLeadDays(Integer minLeadDays) { this.minLeadDays = minLeadDays; }
    public String getBlacklistDatesJson() { return blacklistDatesJson; }
    public void setBlacklistDatesJson(String blacklistDatesJson) { this.blacklistDatesJson = blacklistDatesJson; }
    public String getBlacklistRangesJson() { return blacklistRangesJson; }
    public void setBlacklistRangesJson(String blacklistRangesJson) { this.blacklistRangesJson = blacklistRangesJson; }
}
