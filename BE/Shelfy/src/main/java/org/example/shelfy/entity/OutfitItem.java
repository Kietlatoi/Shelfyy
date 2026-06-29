package org.example.shelfy.entity;

import org.example.shelfy.enums.OutfitSlot;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Gắn một WardrobeItem vào một Outfit với slot cụ thể.
 * VD: outfit_id=1 có item "Áo thun Zara" ở slot TOP.
 *
 * DDL gốc: outfit_items
 */
@Entity
@Table(
    name = "outfit_items",
    indexes = {
        @Index(name = "IX_outfit_items_outfit", columnList = "outfit_id"),
        @Index(name = "IX_outfit_items_item",   columnList = "item_id")
    },
    uniqueConstraints = @UniqueConstraint(
        name = "UQ_outfit_items_slot",
        columnNames = {"outfit_id", "item_id", "slot_name"}
    )
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OutfitItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "outfit_item_id")
    private Long outfitItemId;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "outfit_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_outfit_items_outfit"))
    private Outfit outfit;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false,
                foreignKey = @ForeignKey(name = "FK_outfit_items_item"))
    private WardrobeItem wardrobeItem;

    /** Vị trí của item trong outfit */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "slot_name", nullable = false, length = 50)
    private OutfitSlot slotName;
}
