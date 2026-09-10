package it.pv.payments.domain;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_page_access", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "page_slug")
    private Set<String> pageAccess = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Set<String> getPageAccess() { return pageAccess; }
    public void setPageAccess(Set<String> pageAccess) { this.pageAccess = pageAccess; }
}
